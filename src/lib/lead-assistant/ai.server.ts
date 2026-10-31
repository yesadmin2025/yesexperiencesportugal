import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Output, stepCountIs, type ModelMessage, type ToolSet } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './run-id.server.ts';
export const answerSchema=z.object({reply:z.string(),handoff:z.boolean()}).strict();
export async function generateAssistantAnswer(messages:ModelMessage[],system:string,tools:ToolSet={}) {
 const apiKey=process.env['LOVABLE_API_KEY']; if(!apiKey)throw new Error('Lovable AI is not configured');
 const run=createLovableAiGatewayRunIdFetch();
 let upstreamStatus=0; let upstreamMessage='';
 const provider=createOpenAI({baseURL:'https://ai.gateway.lovable.dev/v1',apiKey,headers:{'Lovable-API-Key':apiKey,'X-Lovable-AIG-SDK':'vercel-ai-sdk'},fetch:async(input,init)=>{
  const response=await run.fetch(input,init);if(!response.ok){upstreamStatus=response.status;try{const body=await response.clone().json() as {message?:string;error?:{message?:string}};upstreamMessage=body.message??body.error?.message??'Lovable AI request failed';}catch{upstreamMessage='Lovable AI request failed';}}return response;
 }});
 const result=streamText({model:provider.responses('openai/gpt-6-astra'),system,messages,tools,
  output:Output.object({schema:answerSchema}),maxRetries:0,maxOutputTokens:2000,
  stopWhen:stepCountIs(50),prepareStep:({stepNumber})=>stepNumber>=3?{toolChoice:'none' as const}:undefined,
  providerOptions:{openai:{forceReasoning:true,reasoningEffort:'low',reasoningSummary:'auto',store:false,include:['reasoning.encrypted_content']}}});
 let output;
 try{output=await result.output;}catch(error){if(upstreamStatus){const failure=new Error(upstreamMessage);Object.assign(failure,{statusCode:upstreamStatus});throw failure;}throw error;}
 if(!output?.reply?.trim())throw new Error('Lovable AI returned no answer');
 return {reply:output.reply.trim().slice(0,3500),handoff:output.handoff,runId:run.getRunId()};
}
