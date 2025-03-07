import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { GetPieceRequestParams, GetPieceRequestQuery, PieceOptionRequest } from "@activepieces/shared";
import { pieces } from "@activepieces/pieces-apps";
import { collectionVersionService } from "../collections/collection-version/collection-version.service";
import { collectionService } from "../collections/collection.service";
import { engineHelper } from "../helper/engine-helper";
import { pieceMetadataLoader } from "./piece-metadata-loader";

export const piecesController: FastifyPluginAsync = async (app) => {
    app.get("/v1/pieces", async () => {
        return pieces.map(p => p.metadata());
    });

    app.post(
        "/v1/pieces/:pieceName/options",
        {
            schema: {
                body: PieceOptionRequest
            },
        },
        async (
            request: FastifyRequest<{
                Params: { pieceName: string };
                Body: PieceOptionRequest;
            }>,
        ) => {
            const collectionVersion = await collectionVersionService.getOneOrThrow(request.body.collectionVersionId);
            const collection = await collectionService.getOneOrThrow({ id: collectionVersion.collectionId, projectId: request.principal.projectId });
            return engineHelper.executeProp({
                pieceName: request.params.pieceName,
                pieceVersion: request.body.pieceVersion,
                propertyName: request.body.propertyName,
                stepName: request.body.stepName,
                input: request.body.input,
                collectionVersion: collectionVersion,
                projectId: collection.projectId
            })
        }
    );

    app.get("/v2/pieces", async () => {
        return await pieceMetadataLoader.manifest();
    });

    app.get(
        "/v2/pieces/:name",
        {
            schema: {
                params: GetPieceRequestParams,
                querystring: GetPieceRequestQuery,
            },
        },
        async (
            request: FastifyRequest<{
                Params: GetPieceRequestParams;
                Querystring: GetPieceRequestQuery;
            }>,
        ) => {
            const { name } = request.params;
            const { version } = request.query;
            return await pieceMetadataLoader.pieceMetadata(name, version);
        },
    );
};
