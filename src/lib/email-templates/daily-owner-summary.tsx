import {Html,Head,Preview,Body,Container,Heading,Text,Button} from '@react-email/components';
import type {TemplateEntry} from './registry';
function DailyOwnerSummary({date,summary}:{date?:string;summary?:string}) {
 return <Html lang="pt"><Head/><Preview>Resumo YES · {date}</Preview><Body style={{backgroundColor:'#ffffff',fontFamily:'Arial, sans-serif'}}><Container style={{maxWidth:620,padding:'28px 24px'}}><Heading style={{color:'#295B61',fontSize:22}}>O seu dia na YES</Heading><Text>{date}</Text>{(summary??'Sem dados disponíveis.').split('\n').filter(Boolean).map((line,i)=><Text key={i} style={{color:'#2E2E2E',lineHeight:1.6}}>{line}</Text>)}<Button href="https://yesexperiencesportugal.com/admin/operations" style={{backgroundColor:'#295B61',color:'#FAF8F3',padding:'12px 20px'}}>Ver operações</Button></Container></Body></Html>;
}
export const template={component:DailyOwnerSummary,subject:(d:Record<string,unknown>)=>`Resumo YES · ${d.date}`,displayName:'Resumo diário da direção',previewData:{date:'2026-10-30',summary:'Sem vendas registadas neste período.'}} satisfies TemplateEntry;
