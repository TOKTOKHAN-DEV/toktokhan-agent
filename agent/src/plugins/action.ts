import { z } from "zod";

import {
    IAgentRuntime,
    Memory,
    elizaLogger,
    Action,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { EmailData, emptyEmailData } from "./index";

import emailjs from "@emailjs/browser";

const sendEmailAction: Action = {
    name: "SEND_EMAIL",
    similes: ["SEND_EMAIL"],
    description: "Send an email",
    validate: async (
        _runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        try {
            const roomId = _message.roomId;
            // DB에서 대화 내용 가져오기
            const memories =
                await _runtime.databaseAdapter.getMemoriesByRoomIds({
                    agentId: _runtime.agentId,
                    roomIds: [roomId],
                    tableName: "messages",
                });

            // 똑순이가 아닌 사용자의 대화 내용 가져오기
            const userMemories = memories.filter(
                (m) => m.content.user !== "똑순이"
            );

            const userMemoriesText = userMemories
                .map((m) => m.content.text)
                .join("\n");

            const extractionTemplate = `
            Extract email addresses mentioned by the user from the conversation.
            Only extract email addresses that were directly mentioned by the user.

            Conversation:
            ${userMemoriesText}

            Return as a JSON object in the following format:
            {
                "email": "explicitly mentioned email address"
            }

            Important notes:
            - Verify the email format is valid (e.g., xxx@xxx.xxx)
            - Only include emails that the user clearly indicates are their own
            - Return an empty value if uncertain or if the email belongs to someone else
            - If multiple emails are mentioned, use the most recently mentioned one
            `;

            const extractedInfo = await generateObject({
                runtime: _runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
                schema: z.object({
                    email: z.string().email(),
                }),
            });

            const email = extractedInfo.object["email"];
            if (email) {
                const receiveTemplate = `
                Analyze: Check if the user is expressing interest in receiving company information or materials.

                Conversation:
                ${_message.content.text}

                Return as a JSON object in the following format:
                {
                    "is_want_to_receive": "true or false"
                }

                Important notes:
                - Return "true" if:
                    * User explicitly requests company information
                    * User asks for materials or brochures
                    * User wants to receive detailed information via email
                - Return "false" if:
                    * No clear request for materials
                    * Ambiguous or unrelated requests
                - Example expressions to look for:
                    * "Please send me company information"
                    * "Can I get more details?"
                    * "I'd like to receive materials by email"
                    * "Could you share the company brochure?"
                `;

                const receiveInfo = await generateObject({
                    runtime: _runtime,
                    context: receiveTemplate, // extractionTemplate을 receiveTemplate으로 수정
                    modelClass: ModelClass.SMALL,
                    schema: z.object({
                        is_want_to_receive: z.boolean(),
                    }),
                });

                console.log(
                    "@@@ receiveInfo : ",
                    receiveInfo.object["is_want_to_receive"]
                );

                const cacheKey = `${_runtime.character.name}/${_message.userId}/data`;
                await _runtime.cacheManager.set(cacheKey, {
                    email,
                    is_want_to_receive:
                        receiveInfo.object["is_want_to_receive"],
                });
            }
        } catch (error) {
            elizaLogger.error("Error in sendEmailAction.validate : ", error);
            return false;
        }
    },
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        try {
            const cacheKey = `${_runtime.character.name}/${_message.userId}/data`;
            const cachedData = (await _runtime.cacheManager.get<any>(
                cacheKey
            )) || { ...emptyEmailData };
            const is_want_to_receive = cachedData.is_want_to_receive;
            if (!is_want_to_receive) return false;

            const email = cachedData.email;

            if (email) {
                const templateParams = {
                    to_email: email,
                };
                // TODO : Call Send Eamil API

                // emailjs
                //     .send(
                //         "service_5ydc9zn",
                //         "template_b1gi6um",
                //         templateParams,
                //         {
                //             publicKey: process.env.EMAILJS_USER_ID,
                //         }
                //     )
                //     .then(
                //         (response) => {
                //             console.log(
                //                 "SUCCESS! ",
                //                 response.status,
                //                 response.text
                //             );
                //             return true;
                //         },
                //         (error) => {
                //             elizaLogger.error(
                //                 "Error in sendEmailAction.handler : ",
                //                 error
                //             );
                //             return false;
                //         }
                //     );
            }
            return false;
        } catch (error) {
            elizaLogger.error("Error in sendEmailAction.handler : ", error);
            return false;
        }
    },
    examples: [],
};

export { sendEmailAction };
