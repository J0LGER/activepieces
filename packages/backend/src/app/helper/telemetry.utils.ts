import { PostHog } from 'posthog-node'
import { SystemProp } from "./system/system-prop";
import { system } from "./system/system";
import { ProjectId, TelemetryEvent, User } from '@activepieces/shared';
import { projectService } from '../project/project.service';
import { getEdition } from './license-helper';


const telemetryEnabled = system.getBoolean(SystemProp.TELEMETRY_ENABLED) ?? true;

const client = new PostHog(
    'phc_7F92HoXJPeGnTKmYv0eOw62FurPMRW9Aqr0TPrDzvHh'
)

export const telemetry = {
    async identify(user: User, projectId: ProjectId): Promise<void> {
        if (!telemetryEnabled) {
            return;
        }
        client.identify({
            distinctId: user.id,
            properties: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                projectId: projectId,
                ...(await getMetadata())
            }
        })
    },
    async trackProject(projectId: ProjectId, event: TelemetryEvent): Promise<void> {
        if (!telemetryEnabled) {
            return;
        }
        const project = await projectService.getOne(projectId);
        client.capture({
            distinctId: project.ownerId,
            event: event.name,
            properties: {
                ...event.payload,
                ...(await getMetadata()),
                datetime: new Date().toISOString(),
            }
        })

    }
}

async function getMetadata() {
    const currentVersion = (await import('../../../../../package.json')).version;
    const edition = await getEdition();
    return {
        activepiecesVersion: currentVersion,
        activepiecesEnvironment: system.get(SystemProp.ENVIRONMENT),
        activepiecesEdition: edition,
    }
}