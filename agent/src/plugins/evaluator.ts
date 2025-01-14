import { z } from "zod";

import {
    IAgentRuntime,
    Memory,
    Evaluator,
    elizaLogger,
    Provider,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { EmailData, emptyEmailData, isDataComplete } from "./index";

const emailEvaluator: Evaluator = {
    name: "GET_EMAIL",
    similes: ["GET_EMAIL", "GET_EMAIL_ADDRESS", "GET_EMAIL_INFO"],
    description: "Get email address",

    validate: async (
        _runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        try {
            const cacheKey = `${_runtime.character.name}/${_message.userId}/data`;
            const cachedData = (await _runtime.cacheManager.get<EmailData>(
                cacheKey
            )) || { ...emptyEmailData };

            return isDataComplete(cachedData);
        } catch (error) {
            elizaLogger.error("Error in emailEvaluator.validate : ", error);
            return false;
        }
    },
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        try {
            const cacheKey = `${_runtime.character.name}/${_message.userId}/data`;
            const cachedData = (await _runtime.cacheManager.get<EmailData>(
                cacheKey
            )) || { ...emptyEmailData };

            const extractionTemplate = `
            Analyze the following conversation to extract personal information.
            Only extract information that the user explicitly mentions about themselves.

            Conversation:
            ${_message.content.text}

            Return a JSON object containing only clearly identified information:
            {
                "email": "extracted email if specified",
            }

            Only include fields where information is explicit and current.
            Omit fields if information is unclear, hypothetical, or about someone else.
            `;

            const extractedInfo = await generateObject({
                runtime: _runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
                schema: z.object({
                    email: z.string(),
                }),
            });

            let updatedData = false;
            if (extractedInfo["email"] && cachedData.email === undefined) {
                cachedData.email = extractedInfo["email"];
                updatedData = true;
            }

            if (updatedData) {
                await _runtime.cacheManager.set(cacheKey, cachedData, {
                    expires: Date.now() + 60 * 60 * 24 * 7 * 1000, // 1 week
                });

                if (isDataComplete(cachedData)) {
                    elizaLogger.success(
                        `User Data collection completed: `,
                        cachedData
                    );
                }
            }
        } catch (error) {
            elizaLogger.error("Error in emailEvaluator.handler : ", error);
            return false;
        }
    },
    examples: [
        {
            context: "Initial user introduction",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "제 이메일은 wkddnjset@naver.com 입니다.",
                    },
                },
            ],
            outcome: `{
                email: "wkddnjset@naver.com",
            }`,
        },
    ],
};

export { emailEvaluator };
