import { Plugin } from "@elizaos/core";

import { emailEvaluator } from "./evaluator";
import { emailProvider } from "./provider";
import { sendEmailAction } from "./action";

export interface EmailData {
    email: string | undefined;
}

export const emptyEmailData: EmailData = {
    email: undefined,
};

export const isDataComplete = (emailData: EmailData): boolean => {
    return emailData.email !== undefined;
};

export const toktokhanPlugin: Plugin = {
    name: "TOKTOKHAN",
    description: "A plugin that get user's email and send email",
    actions: [sendEmailAction],
    evaluators: [emailEvaluator],
    providers: [emailProvider],
};
