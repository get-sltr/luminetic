import{BedrockRuntimeClient as B,InvokeModelCommand as k}from"@aws-sdk/client-bedrock-runtime";import{DynamoDBClient as V}from"@aws-sdk/client-dynamodb";import{DynamoDBDocumentClient as q,UpdateCommand as R}from"@aws-sdk/lib-dynamodb";import{SecretsManagerClient as X,GetSecretValueCommand as H}from"@aws-sdk/client-secrets-manager";import{S3Client as Z,GetObjectCommand as W,DeleteObjectCommand as Q}from"@aws-sdk/client-s3";import{DeviceFarmClient as ee,CreateUploadCommand as ne,GetUploadCommand as te,ScheduleRunCommand as se,GetRunCommand as ae,ListArtifactsCommand as ie}from"@aws-sdk/client-device-farm";var b=process.env.AWS_REGION||"us-east-1",C=process.env.DYNAMODB_TABLE||"appready",N=new B({region:b}),P=q.from(new V({region:b})),oe=new X({region:b}),x=new Z({region:b}),A=process.env.S3_BUCKET,h=new ee({region:"us-west-2"}),D=process.env.DEVICE_FARM_PROJECT_ARN,L=process.env.DEVICE_FARM_DEVICE_POOL_ARN,T=null;async function re(){let t=process.env.GEMINI_API_KEY;if(t)return t;if(T)return T;let n=await oe.send(new H({SecretId:"luminetic/gemini-api-key"})),e=n.SecretString?JSON.parse(n.SecretString).GEMINI_API_KEY:null;if(!e)throw new Error("Gemini API key not found");return T=e,e}async function E(t,n,e,s={}){await P.send(new R({TableName:C,Key:{PK:`USER#${t}`,SK:n},UpdateExpression:"SET #s = :s, updatedAt = :now"+Object.keys(s).map((a,i)=>`, #e${i} = :e${i}`).join(""),ExpressionAttributeNames:{"#s":"status",...Object.fromEntries(Object.keys(s).map((a,i)=>[`#e${i}`,a]))},ExpressionAttributeValues:{":s":e,":now":new Date().toISOString(),...Object.fromEntries(Object.entries(s).map(([a,i],o)=>[`:e${o}`,i]))}}))}var F=`You are an expert iOS App Store submission analyst. You analyze .ipa app metadata to identify App Store Review Guideline violations, missing configurations, and submission risks BEFORE the developer submits to Apple.

CRITICAL RULES:
- ONLY flag issues you can PROVE from the provided metadata. Every issue MUST cite specific evidence from the data.
- Do NOT speculate. Do NOT say "might be an issue" or "could cause rejection" without concrete proof.
- If you cannot point to a specific field, framework, or configuration that proves the issue, do NOT include it.
- Assign a confidence score (0.0-1.0) to every finding. Only include findings with confidence >= 0.8.
- Confidence 1.0 = provable from metadata (missing required key, wrong value). 0.8-0.9 = strongly indicated by metadata patterns.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Info.plist configuration requirements
- Privacy and data collection requirements (NSUsageDescriptions, ATT, Privacy Manifests)
- In-App Purchase and StoreKit requirements
- Entitlements and capabilities
- Framework/SDK compliance issues
- Common rejection patterns

Analyze the metadata for issues and respond ONLY with valid JSON (no markdown, no backticks):

{
  "guidelines_referenced": [{ "section": "e.g. 2.1", "name": "e.g. App Completeness", "description": "Brief description" }],
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "Exact metadata field or value that proves this issue", "guideline_section": "e.g. 2.1", "confidence": 0.8 }],
  "action_plan": [{ "priority": 1, "action": "Specific action", "details": "Step-by-step guidance", "estimated_effort": "e.g. 1-2 hours" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "positive_signals": ["Things the app does correctly, e.g. proper ATS configuration, all icon sizes present"],
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "iap_configuration": { "status": "pass" | "fail" | "warning" | "unknown" | "not_applicable", "detail": "..." },
    "age_rating": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "minimum_os": { "status": "pass" | "fail" | "warning", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." },
    "sign_in_with_apple": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." },
    "push_notifications": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`,ce=`You are an expert iOS App Store submission analyst. You analyze .ipa metadata to find App Store Review Guideline violations.

CRITICAL RULES:
- ONLY flag issues PROVABLE from the provided metadata. Every issue MUST cite the exact metadata field or value as evidence.
- Do NOT speculate or guess. If you cannot prove it from the data, do NOT include it.
- Assign a confidence score (0.0-1.0) to every finding. Only include findings with confidence >= 0.8.
- Confidence 1.0 = directly provable. 0.8-0.9 = strongly indicated by metadata patterns.

CRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object. Do NOT include any text, explanation, or markdown before or after the JSON. Do NOT start with "Let's", "Sure", "Here", or any other word. Your entire response must be parseable by JSON.parse().

Respond with this exact JSON structure:

{
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "Exact metadata field or value that proves this", "guideline_section": "e.g. 2.1", "reasoning": "Step-by-step reasoning", "confidence": 0.8 }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`,le=`You are a meticulous iOS App Store review compliance analyst. Analyze the provided .ipa metadata independently for App Store Review Guideline compliance.

CRITICAL RULES:
- ONLY flag issues you can PROVE from the provided metadata. Cite exact fields and values as evidence.
- Do NOT speculate or include "might" or "could" issues. If it is not provable, omit it.
- Assign a confidence score (0.0-1.0) to every finding. Only include findings with confidence >= 0.8.
- For each issue you identify, you MUST include the specific metadata that proves it exists.

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "validation": {
    "confirmed_issues": ["..."],
    "disputed_issues": [{ "original_issue": "...", "dispute_reason": "...", "correction": "..." }],
    "missed_issues": [{ "severity": "critical"|"major"|"minor", "issue": "...", "guideline_section": "...", "evidence": "Exact metadata proving this", "action": "...", "confidence": 0.8 }]
  },
  "refined_preflight": {
    "privacy_policy": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "account_deletion": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "export_compliance": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "iap_configuration": { "status": "pass"|"fail"|"warning"|"unknown"|"not_applicable", "detail": "..." },
    "age_rating": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "permissions_usage": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "att_compliance": { "status": "pass"|"fail"|"warning"|"not_applicable", "detail": "..." },
    "sign_in_with_apple": { "status": "pass"|"fail"|"warning"|"not_applicable", "detail": "..." }
  }
}`,ue=`You are the final-stage senior App Store review analyst. You reconcile findings from three independent AI analyses (Gemini/Mistral, DeepSeek, Claude Sonnet) to produce the authoritative final assessment.

CRITICAL RULES:
- REMOVE any finding that lacks concrete evidence from the app metadata. If a model flagged something speculative, DROP IT.
- Only keep findings where at least one model cited specific metadata fields/values as proof.
- If two models agree on a finding with evidence, confidence = high. If only one model found it but with strong evidence, confidence = medium.
- If a finding is based on assumptions or "might be" language, EXCLUDE it entirely.
- Assign a numeric confidence (0.0-1.0) to every finding. Drop anything below 0.8.

Your job:
- RECONCILE all findings: confirm agreements, resolve disagreements, REMOVE unsubstantiated claims
- Produce the FINAL action plan with confidence levels
- Assign the FINAL readiness score (0-100)
- Generate App Store reviewer notes
- Include positive signals (things the app does correctly)

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "refined_action_plan": [{ "priority": 1, "action": "...", "details": "...", "estimated_effort": "...", "confidence": "high"|"medium"|"low", "numeric_confidence": 0.9, "source": "gemini_confirmed"|"sonnet_added"|"opus_refined"|"deepseek_added", "evidence": "Specific metadata proving this issue" }],
  "final_assessment": { "score": 0-100, "confidence": "high"|"medium"|"low", "summary": "...", "agreement_level": "full"|"partial"|"significant_disagreement", "risk_factors": ["..."] },
  "positive_signals": ["Things the app does correctly"],
  "review_packet_notes": {
    "testing_steps": ["Step-by-step testing instructions for Apple reviewer"],
    "reviewer_notes": "Notes to include in the App Store Connect reviewer notes field",
    "known_limitations": ["Any known limitations to disclose"]
  }
}`;async function de(t){let n=Date.now();try{let e={max_tokens:8192,temperature:.2,messages:[{role:"system",content:F},{role:"user",content:`Analyze this iOS app's metadata for App Store Review compliance:

${t}`}]},s=new k({modelId:"mistral.mistral-large-3-675b-instruct",contentType:"application/json",accept:"application/json",body:JSON.stringify(e)}),a=await N.send(s),o=JSON.parse(new TextDecoder().decode(a.body))?.choices?.[0]?.message?.content;if(!o)throw new Error("Empty response from Mistral Large");let c=o.replace(/```json\s*|```/g,"").trim();return{data:JSON.parse(c),success:!0,latency:Date.now()-n}}catch(e){return console.error("[Mistral Large error]",e),{data:null,success:!1,latency:Date.now()-n}}}async function pe(t){let n=Date.now(),e=2;for(let s=1;s<=e;s++)try{let a=await re(),{GoogleGenerativeAI:i}=await import("@google/generative-ai"),l=(await new i(a).getGenerativeModel({model:"gemini-2.5-pro",generationConfig:{temperature:.2,maxOutputTokens:8192}}).generateContent([{text:F},{text:`Analyze this iOS app's metadata for App Store Review compliance:

${t}`}])).response.text().replace(/```json\s*|```/g,"").trim();return{data:JSON.parse(l),success:!0,latency:Date.now()-n}}catch(a){if((a?.status===503||a?.status===429)&&s<e){console.warn(`[Gemini] ${a.status} on attempt ${s}, retrying in 3s...`),await new Promise(o=>setTimeout(o,3e3));continue}return console.error("[Gemini error]",a),console.log("[Gemini] Falling back to Mistral Large 3..."),await de(t)}}async function me(t){let n=Date.now();try{let e={max_tokens:8192,temperature:.2,system:ce,messages:[{role:"user",content:`Analyze this iOS app metadata for App Store compliance. Respond with ONLY valid JSON:

${t}`}]},s=new k({modelId:"deepseek.v3.2",contentType:"application/json",accept:"application/json",body:JSON.stringify(e)}),a=await N.send(s),i=JSON.parse(new TextDecoder().decode(a.body)),o=i?.choices?.[0]?.message?.content||i?.content?.[0]?.text||null;if(!o)throw new Error("Empty response from DeepSeek");let c=(typeof o=="string"?o:JSON.stringify(o)).replace(/```json\s*|```/g,"").trim();return{data:JSON.parse(c),success:!0,latency:Date.now()-n}}catch(e){return console.error("[DeepSeek error]",e),{data:null,success:!1,latency:Date.now()-n}}}async function fe(t){let n=Date.now();try{let e={anthropic_version:"bedrock-2023-05-31",max_tokens:4096,temperature:.2,system:le,messages:[{role:"user",content:`APP METADATA:
${t}

Analyze this iOS app's metadata for App Store Review compliance.`}]},s=new k({modelId:"us.anthropic.claude-sonnet-4-6",contentType:"application/json",accept:"application/json",body:JSON.stringify(e)}),a=await N.send(s),o=JSON.parse(new TextDecoder().decode(a.body))?.content?.[0]?.text;if(!o)throw new Error("Empty response from Sonnet");let c=o.replace(/```json\s*|```/g,"").trim();return{data:JSON.parse(c),success:!0,latency:Date.now()-n}}catch(e){return console.error("[Sonnet error]",e),{data:null,success:!1,latency:Date.now()-n}}}async function ye(t,n,e,s){let a=Date.now();try{let i=`APP METADATA:
${t}

GEMINI ANALYSIS:
${JSON.stringify(n,null,2)}

DEEPSEEK ANALYSIS:
${JSON.stringify(e,null,2)}

CLAUDE SONNET ANALYSIS:
${JSON.stringify(s,null,2)}

Reconcile all findings and produce the final assessment.`,o={anthropic_version:"bedrock-2023-05-31",max_tokens:4096,temperature:.2,system:ue,messages:[{role:"user",content:i}]},c=new k({modelId:"us.anthropic.claude-opus-4-6-v1",contentType:"application/json",accept:"application/json",body:JSON.stringify(o)}),d=await N.send(c),l=JSON.parse(new TextDecoder().decode(d.body))?.content?.[0]?.text;if(!l)throw new Error("Empty response from Opus");let m=l.replace(/```json\s*|```/g,"").trim();return{data:JSON.parse(m),success:!0,latency:Date.now()-a}}catch(i){return console.error("[Opus error]",i),{data:null,success:!1,latency:Date.now()-a}}}async function ge(t,n){if(!D||!L)return null;try{let e=await h.send(new ne({projectArn:D,name:t.split("/").pop()||"app.ipa",type:"IOS_APP"})),s=e.upload?.arn,a=e.upload?.url;if(!s||!a)throw new Error("No upload ARN/URL returned");let o=await(await x.send(new W({Bucket:n,Key:t}))).Body.transformToByteArray(),c=await fetch(a,{method:"PUT",body:o,headers:{"Content-Type":"application/octet-stream"}});if(!c.ok)throw new Error(`Upload PUT failed: ${c.status}`);for(let d=0;d<30;d++){let r=await h.send(new te({arn:s})),l=r.upload?.status;if(l==="SUCCEEDED")return s;if(l==="FAILED")throw new Error(`Upload processing failed: ${r.upload?.message}`);await new Promise(m=>setTimeout(m,5e3))}throw new Error("Upload processing timed out")}catch(e){return console.error("[Device Farm upload error]",e),null}}async function we(t){try{return(await h.send(new se({projectArn:D,appArn:t,devicePoolArn:L,name:`luminetic-scan-${Date.now()}`,test:{type:"BUILTIN_FUZZ"},executionConfiguration:{jobTimeoutMinutes:5,accountsCleanup:!0,appPackagesCleanup:!0}}))).run?.arn||null}catch(n){return console.error("[Device Farm schedule error]",n),null}}async function _e(t){for(let e=0;e<200;e++)try{let s=await h.send(new ae({arn:t})),a=s.run?.status;if(a==="COMPLETED")return s.run;if(a==="ERRORED"||a==="STOPPED")return console.warn(`[Device Farm] Run ended with status: ${a}`),s.run;await new Promise(i=>setTimeout(i,3e3))}catch(s){return console.error("[Device Farm poll error]",s),null}return console.warn("[Device Farm] Polling timed out"),null}async function Se(t,n){try{let e=await h.send(new ie({arn:t,type:"FILE"})),s=[],a=null,i=null;for(let r of e.artifacts||[])r.type==="SCREENSHOT"&&r.url&&s.push(r.url),r.type==="VIDEO"&&r.url&&(a=r.url),r.type==="DEVICE_LOG"&&r.url&&(i=r.url);let o=n?.counters||{},c=(o.errored||0)+(o.failed||0),d=n?.result!=="ERRORED"&&c===0;return{layer:"runtime_analysis",device:n?.device?{name:n.device.name||"Unknown",os_version:n.device.os||"Unknown",model_id:n.device.model||"Unknown"}:null,results:{launch_success:d,crashes:[],crash_count:c,test_duration_seconds:Math.round((n?.deviceMinutes?.total||0)*60),memory_peak_mb:null,cpu_peak_percent:null,screenshots:s,video_url:a,device_logs_url:i},fuzz_results:{events_sent:null,ui_elements_discovered:null,unresponsive_periods:null},skipped:!1,skip_reason:null}}catch(e){return console.error("[Device Farm results error]",e),null}}async function he(t,n){let e=Date.now();if(!D||!L||!t)return{layer:"runtime_analysis",device:null,results:null,fuzz_results:null,skipped:!0,skip_reason:"Device Farm not configured",latency:Date.now()-e};let s=await ge(t,n);if(!s)return{layer:"runtime_analysis",device:null,results:null,fuzz_results:null,skipped:!0,skip_reason:"IPA upload to Device Farm failed",latency:Date.now()-e};let a=await we(s);if(!a)return{layer:"runtime_analysis",device:null,results:null,fuzz_results:null,skipped:!0,skip_reason:"Failed to schedule Device Farm run",latency:Date.now()-e};let i=await _e(a);if(!i)return{layer:"runtime_analysis",device:null,results:null,fuzz_results:null,skipped:!0,skip_reason:"Device Farm run timed out or failed",latency:Date.now()-e};let o=await Se(a,i);return o&&(o.latency=Date.now()-e),o||{layer:"runtime_analysis",device:null,results:null,fuzz_results:null,skipped:!0,skip_reason:"Failed to collect results",latency:Date.now()-e}}function O(t){if(t==null)return null;if(typeof t=="number"&&Number.isFinite(t))return Math.max(0,Math.min(100,Math.round(t)));if(typeof t=="string"){let n=t.trim().match(/^(\d+(\.\d+)?)/);if(n){let e=Math.round(parseFloat(n[1]));return Number.isFinite(e)?Math.max(0,Math.min(100,e)):null}}return null}function ve(t){if(!t.length)return 72;let n=0;for(let e of t){let s=String(e?.severity||"minor").toLowerCase();s==="critical"?n+=20:s==="major"?n+=10:n+=3}return Math.max(10,Math.min(95,100-Math.min(90,n)))}function Ae(t,n,e,s){let a=O(t?.score)??O(t?.readiness_score),i=O(n?.score)??O(n?.readiness_score);if(a!=null&&i!=null){let o=Math.round(a*.3+i*.7);if(o>0)return o}return i!=null&&i>0?i:a!=null&&a>0?a:e.length>0?ve(e):s?65:0}function Ee({gemini:t,deepseek:n,sonnet:e,opus:s,context:a,ipaMetadata:i,layer1:o,layer2:c,totalStart:d}){let r=t.data,l=n.data,m=e.data,p=s.data,f=r?.issues_identified||[],y=l?.issues_identified||[],g=new Set(f.map(u=>(u?.issue||"").toLowerCase().slice(0,60))),_=y.filter(u=>!g.has((u?.issue||"").toLowerCase().slice(0,60))),w=m?.validation?.missed_issues||[],v=m?.validation?.disputed_issues||[],U=new Set(v.map(u=>u?.original_issue)),M=[...f.filter(u=>!U.has(u?.issue)),..._.map(u=>({...u,source:"deepseek_added"})),...v.map(u=>({severity:"major",issue:u?.correction,evidence:u?.dispute_reason,source:"sonnet_corrected"})),...w.map(u=>({...u,source:"sonnet_added"}))],S=p?.final_assessment||null,I=r?.readiness_assessment||null,$=t.success||n.success||e.success||s.success,j=Ae(I,S,M,$),J=r?.preflight_checks||{},G=l?.preflight_checks||{},Y=m?.refined_preflight||{},K={...J,...G,...Y},z=p?.review_packet_notes||{};return{guidelines:r?.guidelines_referenced||[],issues:M,action_plan:p?.refined_action_plan||r?.action_plan||[],assessment:{score:j,confidence:S?.confidence||"medium",summary:S?.summary||I?.summary||"Analysis completed.",agreement_level:S?.agreement_level||"partial",risk_factors:S?.risk_factors||I?.risk_factors||[]},preflight:K,review_packet:z,layer1_findings:o?.findings||[],layer1_metadata:o?.metadata||null,layer2_runtime:c||null,ipa_metadata:i||null,meta:{models_used:[t.success&&"gemini",n.success&&"deepseek",e.success&&"sonnet",s.success&&"opus"].filter(Boolean),gemini_latency_ms:t.latency,deepseek_latency_ms:n.latency,sonnet_latency_ms:e.latency,opus_latency_ms:s.latency,total_latency_ms:Date.now()-d,gemini_success:t.success,deepseek_success:n.success,sonnet_success:e.success,opus_success:s.success}}}var Te=async t=>{let{userId:n,scanSK:e,scanId:s,contextForAI:a,layer1:i,ipaMetadata:o,s3Key:c,bundleId:d}=t,r=Date.now();try{let l=a;i&&i.findings&&i.findings.length>0&&(l=a+`

## STATIC ANALYSIS FINDINGS (Layer 1 - Proven Facts, confidence 1.0)
These findings are proven from the binary. Do NOT dispute them. Focus on providing remediation and identifying additional issues.

`+JSON.stringify(i.findings,null,2)+`

## STATIC ANALYSIS METADATA
`+JSON.stringify(i.metadata,null,2)),await E(n,e,"analyzing");let m=he(c,A),[p,f,y]=await Promise.all([pe(l),fe(l),me(l)]);if(console.log(`[Stage 1] Gemini=${p.success}(${p.latency}ms) Sonnet=${f.success}(${f.latency}ms) DeepSeek=${y.success}(${y.latency}ms)`),!p.success&&!f.success&&!y.success)return await E(n,e,"error",{errorMessage:"All AI models failed in Stage 1. Please try again."}),{statusCode:500,body:"All Stage 1 models failed"};await E(n,e,"reconciling");let g=await ye(a,p.data,y.data,f.data);console.log(`[Stage 2] Opus=${g.success}(${g.latency}ms)`);let _=await m;console.log(`[Device Farm] skipped=${_?.skipped} latency=${_?.latency}ms`);let w=Ee({gemini:p,deepseek:y,sonnet:f,opus:g,contextForAI:a,ipaMetadata:o,layer1:i,layer2:_,totalStart:r});if(await P.send(new R({TableName:C,Key:{PK:`USER#${n}`,SK:e},UpdateExpression:"SET #s = :s, mergedResult = :mr, geminiResult = :gr, deepseekResult = :dr, claudeResult = :cr, sonnetResult = :sr, score = :sc, updatedAt = :now",ExpressionAttributeNames:{"#s":"status"},ExpressionAttributeValues:{":s":"complete",":mr":w,":gr":p.data,":dr":y.data,":cr":g.data,":sr":f.data,":sc":w.assessment.score,":now":new Date().toISOString()}})),await P.send(new R({TableName:C,Key:{PK:`USER#${n}`,SK:"PROFILE"},UpdateExpression:"ADD scanCount :inc SET updatedAt = :now",ExpressionAttributeValues:{":inc":1,":now":new Date().toISOString()}})),c&&A)try{await x.send(new Q({Bucket:A,Key:c})),console.log(`[Cleanup] Deleted s3://${A}/${c}`)}catch(v){console.warn("[Cleanup] Failed to delete IPA (non-fatal):",v)}return console.log(`[Done] scanId=${s} score=${w.assessment.score} total=${Date.now()-r}ms`),{statusCode:200,body:JSON.stringify({scanId:s,score:w.assessment.score})}}catch(l){return console.error("[Lambda fatal]",l),await E(n,e,"error",{errorMessage:"Analysis failed unexpectedly. Please try again."}).catch(()=>{}),{statusCode:500,body:String(l)}}};export{Te as handler};
