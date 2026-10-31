import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Output, stepCountIs, type ModelMessage, type ToolSet } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './run-id.server.ts';
export const answerSchema=z.object({reply:z.string(),handoff:z.boolean()}).strict();
export async function generateAssistantAnswer(messages:ModelMessage[],system:string,tools:ToolSet={}) {
 const apiKey=process.env['LOVABLE_API_KEY']; if(!apiKey)throw new Error('Lovable AI is not configured');
 const run=createLovableAiGatewayRunIdFetch();
 const provider=createOpenAI({baseURL:'https://ai.gateway.lovable.dev/v1',apiKey,headers:{'Lovable-API-Key':apiKey,'X-Lovable-AIG-SDK':'vercel-ai-sdk'},fetch:run.fetch});
 const result=streamText({model:provider.responses('openai/gpt-6-astra'),system,messages,tools,
  output:Output.object({schema:answerSchema}),maxRetries:0,maxOutputTokens:2000,
  stopWhen:stepCountIs(50),prepareStep:({stepNumber})=>stepNumber>=3?{toolChoice:'none' as const}:undefined,
  providerOptions:{openai:{forceReasoning:true,reasoningEffort:'low',reasoningSummary:'auto',store:false,include:['reasoning.encrypted_content']}}});
 const output=await result.output;
 if(!output?.reply?.trim())throw new Error('Lovable AI returned no answer');
 return {reply:output.reply.trim().slice(0,3500),handoff:output.handoff,runId:run.getRunId()};
}
