import {
  createTrigger,
  httpClient,
  HttpRequest,
  HttpMethod,
  AuthenticationType,
  TriggerStrategy,
} from '@activepieces/framework';
import { githubCommon } from '../common';

export const githubRegisterTrigger = ({
  name,
  displayName,
  description,
  sampleData
}: {
  name: string,
  displayName: string,
  description: string,
  sampleData: object
}) => createTrigger({
  name: `trigger_${name}`,
  displayName,
  description,
  props: {
    authentication: githubCommon.authentication,
    repository: githubCommon.repositoryDropdown
  },
  sampleData,
  type: TriggerStrategy.WEBHOOK,
  async onEnable(context) {
    const { repo, owner } = context.propsValue['repository']!;
    const request: HttpRequest = {
      method: HttpMethod.POST,
      url: `${githubCommon.baseUrl}/repos/${owner}/${repo}/hooks`,
      body: {
        owner: owner,
        repo: repo,
        active: true,
        events: [name],
        config: {
          url: context.webhookUrl,
          content_type: 'json',
          insecure_ssl: '0',
        },
      },
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: context.propsValue['authentication']['access_token'],
      },
      queryParams: {},
    };
    const { body: webhook } = await httpClient.sendRequest<{ id: string }>(request);
    await context.store.put<WebhookInformation>(`github_${name}_trigger`, {
      webhookId: webhook.id,
      owner: owner,
      repo: repo,
    });
  },
  async onDisable(context) {
    const response = await context.store.get<WebhookInformation>(`github_${name}_trigger`);
    if (response !== null && response !== undefined) {
      const request: HttpRequest = {
        method: HttpMethod.DELETE,
        url: `${githubCommon.baseUrl}/repos/${response.owner}/${response.repo}/hooks/${response.webhookId}`,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: context.propsValue['authentication']['access_token'],
        },
      };
      await httpClient.sendRequest(request);
    }
  },
  async run(context) {
    console.debug("payload received", context.payload.body)

    if (isVerficationCall(context.payload.body)) {
      return [];
    }
    return [context.payload.body];
  },
});

function isVerficationCall(payload: Record<string, any>) {
  return payload['zen'] !== undefined;
}

interface WebhookInformation {
  webhookId: string;
  repo: string;
  owner: string;
}
