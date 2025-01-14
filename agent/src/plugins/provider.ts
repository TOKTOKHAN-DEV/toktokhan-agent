import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
    elizaLogger,
} from "@elizaos/core";

import { EmailData, emptyEmailData } from "./index";

const emailGuidelines = `Missing Information and Extraction Guidelines:

email:
- description: Extract the user's email address.
- valid: wkddnjset@naver.com, nick329@gmail.com
- invalid: Emails with domains test.com, example.com
`;

const emailProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        try {
            const cacheKey = `${_runtime.character.name}/${_message.userId}/data`;
            const cachedData = (await _runtime.cacheManager.get<EmailData>(
                cacheKey
            )) || { ...emptyEmailData };

            let response = "Email Information Status:\n\n";

            if (cachedData.email) {
                const emailSuccessMessageTemplate = `Current Information:
                Email: ${cachedData.email}

                - Status: ✔️ All necessary information is collected
                - Continue natural conversation without information gathering
                - Ask about receiving company introduction document each time
                `;
                response += emailSuccessMessageTemplate;
            } else {
                response += emailGuidelines;
            }

            console.log("@@@@@ response : ", response);
            return response;
        } catch (error) {
            elizaLogger.error("Error in emailProvider.get : ", error);
            return "Error accessing user information. Continuing conversation normally.";
        }
    },
};
export { emailProvider };
