import { createRequire } from "module"; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@google/generative-ai/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  BlockReason: () => BlockReason,
  ChatSession: () => ChatSession,
  DynamicRetrievalMode: () => DynamicRetrievalMode,
  ExecutableCodeLanguage: () => ExecutableCodeLanguage,
  FinishReason: () => FinishReason,
  FunctionCallingMode: () => FunctionCallingMode,
  GenerativeModel: () => GenerativeModel,
  GoogleGenerativeAI: () => GoogleGenerativeAI,
  GoogleGenerativeAIAbortError: () => GoogleGenerativeAIAbortError,
  GoogleGenerativeAIError: () => GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError: () => GoogleGenerativeAIFetchError,
  GoogleGenerativeAIRequestInputError: () => GoogleGenerativeAIRequestInputError,
  GoogleGenerativeAIResponseError: () => GoogleGenerativeAIResponseError,
  HarmBlockThreshold: () => HarmBlockThreshold,
  HarmCategory: () => HarmCategory,
  HarmProbability: () => HarmProbability,
  Outcome: () => Outcome,
  POSSIBLE_ROLES: () => POSSIBLE_ROLES,
  SchemaType: () => SchemaType,
  TaskType: () => TaskType
});
function getClientHeaders(requestOptions) {
  const clientHeaders = [];
  if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
    clientHeaders.push(requestOptions.apiClient);
  }
  clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
  return clientHeaders.join(" ");
}
async function getHeaders(url) {
  var _a;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
  headers.append("x-goog-api-key", url.apiKey);
  let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
  if (customHeaders) {
    if (!(customHeaders instanceof Headers)) {
      try {
        customHeaders = new Headers(customHeaders);
      } catch (e) {
        throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
      }
    }
    for (const [headerName, headerValue] of customHeaders.entries()) {
      if (headerName === "x-goog-api-key") {
        throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
      } else if (headerName === "x-goog-api-client") {
        throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
      }
      headers.append(headerName, headerValue);
    }
  }
  return headers;
}
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
  const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
  return {
    url: url.toString(),
    fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), { method: "POST", headers: await getHeaders(url), body })
  };
}
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, fetchFn = fetch) {
  const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
  return makeRequest(url, fetchOptions, fetchFn);
}
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(url, fetchOptions);
  } catch (e) {
    handleResponseError(e, url);
  }
  if (!response.ok) {
    await handleResponseNotOk(response, url);
  }
  return response;
}
function handleResponseError(e, url) {
  let err = e;
  if (err.name === "AbortError") {
    err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  } else if (!(e instanceof GoogleGenerativeAIFetchError || e instanceof GoogleGenerativeAIRequestInputError)) {
    err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  }
  throw err;
}
async function handleResponseNotOk(response, url) {
  let message = "";
  let errorDetails;
  try {
    const json = await response.json();
    message = json.error.message;
    if (json.error.details) {
      message += ` ${JSON.stringify(json.error.details)}`;
      errorDetails = json.error.details;
    }
  } catch (e) {
  }
  throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
function buildFetchOptions(requestOptions) {
  const fetchOptions = {};
  if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== void 0 || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
    const controller = new AbortController();
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
      setTimeout(() => controller.abort(), requestOptions.timeout);
    }
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
      requestOptions.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    fetchOptions.signal = controller.signal;
  }
  return fetchOptions;
}
function addHelpers(response) {
  response.text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return "";
  };
  response.functionCall = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      console.warn(`response.functionCall() is deprecated. Use response.functionCalls() instead.`);
      return getFunctionCalls(response)[0];
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  response.functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  return response;
}
function getText(response) {
  var _a, _b, _c, _d;
  const textStrings = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
      if (part.executableCode) {
        textStrings.push("\n```" + part.executableCode.language + "\n" + part.executableCode.code + "\n```\n");
      }
      if (part.codeExecutionResult) {
        textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join("");
  } else {
    return "";
  }
}
function getFunctionCalls(response) {
  var _a, _b, _c, _d;
  const functionCalls = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return void 0;
  }
}
function hadBadFinishReason(candidate) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
function formatBlockErrorMessage(response) {
  var _a, _b, _c;
  let message = "";
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked";
    if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function(v) {
      return new Promise(function(a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function processStream(response) {
  const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", { fatal: true }));
  const responseStream = getResponseStream(inputStream);
  const [stream1, stream2] = responseStream.tee();
  return {
    stream: generateResponseSequence(stream1),
    response: getResponsePromise(stream2)
  };
}
async function getResponsePromise(stream) {
  const allResponses = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return addHelpers(aggregateResponses(allResponses));
    }
    allResponses.push(value);
  }
}
function generateResponseSequence(stream) {
  return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
    const reader = stream.getReader();
    while (true) {
      const { value, done } = yield __await(reader.read());
      if (done) {
        break;
      }
      yield yield __await(addHelpers(value));
    }
  });
}
function getResponseStream(inputStream) {
  const reader = inputStream.getReader();
  const stream = new ReadableStream({
    start(controller) {
      let currentText = "";
      return pump();
      function pump() {
        return reader.read().then(({ value, done }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
              return;
            }
            controller.close();
            return;
          }
          currentText += value;
          let match = currentText.match(responseLineRE);
          let parsedResponse;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        }).catch((e) => {
          let err = e;
          err.stack = e.stack;
          if (err.name === "AbortError") {
            err = new GoogleGenerativeAIAbortError("Request aborted when reading from the stream");
          } else {
            err = new GoogleGenerativeAIError("Error reading from the stream");
          }
          throw err;
        });
      }
    }
  });
  return stream;
}
function aggregateResponses(responses) {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse = {
    promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      let candidateIndex = 0;
      for (const candidate of response.candidates) {
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[candidateIndex]) {
          aggregatedResponse.candidates[candidateIndex] = {
            index: candidateIndex
          };
        }
        aggregatedResponse.candidates[candidateIndex].citationMetadata = candidate.citationMetadata;
        aggregatedResponse.candidates[candidateIndex].groundingMetadata = candidate.groundingMetadata;
        aggregatedResponse.candidates[candidateIndex].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[candidateIndex].finishMessage = candidate.finishMessage;
        aggregatedResponse.candidates[candidateIndex].safetyRatings = candidate.safetyRatings;
        if (candidate.content && candidate.content.parts) {
          if (!aggregatedResponse.candidates[candidateIndex].content) {
            aggregatedResponse.candidates[candidateIndex].content = {
              role: candidate.content.role || "user",
              parts: []
            };
          }
          const newPart = {};
          for (const part of candidate.content.parts) {
            if (part.text) {
              newPart.text = part.text;
            }
            if (part.functionCall) {
              newPart.functionCall = part.functionCall;
            }
            if (part.executableCode) {
              newPart.executableCode = part.executableCode;
            }
            if (part.codeExecutionResult) {
              newPart.codeExecutionResult = part.codeExecutionResult;
            }
            if (Object.keys(newPart).length === 0) {
              newPart.text = "";
            }
            aggregatedResponse.candidates[candidateIndex].content.parts.push(newPart);
          }
        }
      }
      candidateIndex++;
    }
    if (response.usageMetadata) {
      aggregatedResponse.usageMetadata = response.usageMetadata;
    }
  }
  return aggregatedResponse;
}
async function generateContentStream(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.STREAM_GENERATE_CONTENT,
    apiKey,
    /* stream */
    true,
    JSON.stringify(params),
    requestOptions
  );
  return processStream(response);
}
async function generateContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.GENERATE_CONTENT,
    apiKey,
    /* stream */
    false,
    JSON.stringify(params),
    requestOptions
  );
  const responseJson = await response.json();
  const enhancedResponse = addHelpers(responseJson);
  return {
    response: enhancedResponse
  };
}
function formatSystemInstruction(input) {
  if (input == null) {
    return void 0;
  } else if (typeof input === "string") {
    return { role: "system", parts: [{ text: input }] };
  } else if (input.text) {
    return { role: "system", parts: [input] };
  } else if (input.parts) {
    if (!input.role) {
      return { role: "system", parts: input.parts };
    } else {
      return input;
    }
  }
}
function formatNewContent(request) {
  let newParts = [];
  if (typeof request === "string") {
    newParts = [{ text: request }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === "string") {
        newParts.push({ text: partOrString });
      } else {
        newParts.push(partOrString);
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
  const userContent = { role: "user", parts: [] };
  const functionContent = { role: "function", parts: [] };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if ("functionResponse" in part) {
      functionContent.parts.push(part);
      hasFunctionContent = true;
    } else {
      userContent.parts.push(part);
      hasUserContent = true;
    }
  }
  if (hasUserContent && hasFunctionContent) {
    throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
  }
  if (!hasUserContent && !hasFunctionContent) {
    throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
  }
  if (hasUserContent) {
    return userContent;
  }
  return functionContent;
}
function formatCountTokensInput(params, modelParams) {
  var _a;
  let formattedGenerateContentRequest = {
    model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
    generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
    safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
    tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
    toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
    systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
    cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
    contents: []
  };
  const containsGenerateContentRequest = params.generateContentRequest != null;
  if (params.contents) {
    if (containsGenerateContentRequest) {
      throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
    }
    formattedGenerateContentRequest.contents = params.contents;
  } else if (containsGenerateContentRequest) {
    formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
  } else {
    const content = formatNewContent(params);
    formattedGenerateContentRequest.contents = [content];
  }
  return { generateContentRequest: formattedGenerateContentRequest };
}
function formatGenerateContentInput(params) {
  let formattedRequest;
  if (params.contents) {
    formattedRequest = params;
  } else {
    const content = formatNewContent(params);
    formattedRequest = { contents: [content] };
  }
  if (params.systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
  }
  return formattedRequest;
}
function formatEmbedContentInput(params) {
  if (typeof params === "string" || Array.isArray(params)) {
    const content = formatNewContent(params);
    return { content };
  }
  return params;
}
function validateChatHistory(history) {
  let prevContent = false;
  for (const currContent of history) {
    const { role, parts } = currContent;
    if (!prevContent && role !== "user") {
      throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
    }
    if (!Array.isArray(parts)) {
      throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
    }
    if (parts.length === 0) {
      throw new GoogleGenerativeAIError("Each Content should have at least one part");
    }
    const countFields = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0,
      fileData: 0,
      executableCode: 0,
      codeExecutionResult: 0
    };
    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
      }
    }
    prevContent = true;
  }
}
function isValidResponse(response) {
  var _a;
  if (response.candidates === void 0 || response.candidates.length === 0) {
    return false;
  }
  const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
  if (content === void 0) {
    return false;
  }
  if (content.parts === void 0 || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === void 0 || Object.keys(part).length === 0) {
      return false;
    }
    if (part.text !== void 0 && part.text === "") {
      return false;
    }
  }
  return true;
}
async function countTokens(apiKey, model, params, singleRequestOptions) {
  const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
  return response.json();
}
async function embedContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
  return response.json();
}
async function batchEmbedContents(apiKey, model, params, requestOptions) {
  const requestsWithModel = params.requests.map((request) => {
    return Object.assign(Object.assign({}, request), { model });
  });
  const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({ requests: requestsWithModel }), requestOptions);
  return response.json();
}
var SchemaType, ExecutableCodeLanguage, Outcome, POSSIBLE_ROLES, HarmCategory, HarmBlockThreshold, HarmProbability, BlockReason, FinishReason, TaskType, FunctionCallingMode, DynamicRetrievalMode, GoogleGenerativeAIError, GoogleGenerativeAIResponseError, GoogleGenerativeAIFetchError, GoogleGenerativeAIRequestInputError, GoogleGenerativeAIAbortError, DEFAULT_BASE_URL, DEFAULT_API_VERSION, PACKAGE_VERSION, PACKAGE_LOG_HEADER, Task, RequestUrl, badFinishReasons, responseLineRE, VALID_PART_FIELDS, VALID_PARTS_PER_ROLE, SILENT_ERROR, ChatSession, GenerativeModel, GoogleGenerativeAI;
var init_dist = __esm({
  "node_modules/@google/generative-ai/dist/index.mjs"() {
    (function(SchemaType2) {
      SchemaType2["STRING"] = "string";
      SchemaType2["NUMBER"] = "number";
      SchemaType2["INTEGER"] = "integer";
      SchemaType2["BOOLEAN"] = "boolean";
      SchemaType2["ARRAY"] = "array";
      SchemaType2["OBJECT"] = "object";
    })(SchemaType || (SchemaType = {}));
    (function(ExecutableCodeLanguage2) {
      ExecutableCodeLanguage2["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
      ExecutableCodeLanguage2["PYTHON"] = "python";
    })(ExecutableCodeLanguage || (ExecutableCodeLanguage = {}));
    (function(Outcome2) {
      Outcome2["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
      Outcome2["OUTCOME_OK"] = "outcome_ok";
      Outcome2["OUTCOME_FAILED"] = "outcome_failed";
      Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
    })(Outcome || (Outcome = {}));
    POSSIBLE_ROLES = ["user", "model", "function", "system"];
    (function(HarmCategory2) {
      HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
      HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
      HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
      HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
      HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
      HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
    })(HarmCategory || (HarmCategory = {}));
    (function(HarmBlockThreshold2) {
      HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
      HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
      HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
      HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
      HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
    })(HarmBlockThreshold || (HarmBlockThreshold = {}));
    (function(HarmProbability2) {
      HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
      HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
      HarmProbability2["LOW"] = "LOW";
      HarmProbability2["MEDIUM"] = "MEDIUM";
      HarmProbability2["HIGH"] = "HIGH";
    })(HarmProbability || (HarmProbability = {}));
    (function(BlockReason2) {
      BlockReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
      BlockReason2["SAFETY"] = "SAFETY";
      BlockReason2["OTHER"] = "OTHER";
    })(BlockReason || (BlockReason = {}));
    (function(FinishReason2) {
      FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
      FinishReason2["STOP"] = "STOP";
      FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
      FinishReason2["SAFETY"] = "SAFETY";
      FinishReason2["RECITATION"] = "RECITATION";
      FinishReason2["LANGUAGE"] = "LANGUAGE";
      FinishReason2["BLOCKLIST"] = "BLOCKLIST";
      FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
      FinishReason2["SPII"] = "SPII";
      FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
      FinishReason2["OTHER"] = "OTHER";
    })(FinishReason || (FinishReason = {}));
    (function(TaskType2) {
      TaskType2["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
      TaskType2["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
      TaskType2["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
      TaskType2["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
      TaskType2["CLASSIFICATION"] = "CLASSIFICATION";
      TaskType2["CLUSTERING"] = "CLUSTERING";
    })(TaskType || (TaskType = {}));
    (function(FunctionCallingMode2) {
      FunctionCallingMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
      FunctionCallingMode2["AUTO"] = "AUTO";
      FunctionCallingMode2["ANY"] = "ANY";
      FunctionCallingMode2["NONE"] = "NONE";
    })(FunctionCallingMode || (FunctionCallingMode = {}));
    (function(DynamicRetrievalMode2) {
      DynamicRetrievalMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
      DynamicRetrievalMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
    })(DynamicRetrievalMode || (DynamicRetrievalMode = {}));
    GoogleGenerativeAIError = class extends Error {
      constructor(message) {
        super(`[GoogleGenerativeAI Error]: ${message}`);
      }
    };
    GoogleGenerativeAIResponseError = class extends GoogleGenerativeAIError {
      constructor(message, response) {
        super(message);
        this.response = response;
      }
    };
    GoogleGenerativeAIFetchError = class extends GoogleGenerativeAIError {
      constructor(message, status, statusText, errorDetails) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.errorDetails = errorDetails;
      }
    };
    GoogleGenerativeAIRequestInputError = class extends GoogleGenerativeAIError {
    };
    GoogleGenerativeAIAbortError = class extends GoogleGenerativeAIError {
    };
    DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
    DEFAULT_API_VERSION = "v1beta";
    PACKAGE_VERSION = "0.24.1";
    PACKAGE_LOG_HEADER = "genai-js";
    (function(Task2) {
      Task2["GENERATE_CONTENT"] = "generateContent";
      Task2["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
      Task2["COUNT_TOKENS"] = "countTokens";
      Task2["EMBED_CONTENT"] = "embedContent";
      Task2["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
    })(Task || (Task = {}));
    RequestUrl = class {
      constructor(model, task, apiKey, stream, requestOptions) {
        this.model = model;
        this.task = task;
        this.apiKey = apiKey;
        this.stream = stream;
        this.requestOptions = requestOptions;
      }
      toString() {
        var _a, _b;
        const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
        const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
        let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
        if (this.stream) {
          url += "?alt=sse";
        }
        return url;
      }
    };
    badFinishReasons = [
      FinishReason.RECITATION,
      FinishReason.SAFETY,
      FinishReason.LANGUAGE
    ];
    responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
    VALID_PART_FIELDS = [
      "text",
      "inlineData",
      "functionCall",
      "functionResponse",
      "executableCode",
      "codeExecutionResult"
    ];
    VALID_PARTS_PER_ROLE = {
      user: ["text", "inlineData"],
      function: ["functionResponse"],
      model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
      // System instructions shouldn't be in history anyway.
      system: ["text"]
    };
    SILENT_ERROR = "SILENT_ERROR";
    ChatSession = class {
      constructor(apiKey, model, params, _requestOptions = {}) {
        this.model = model;
        this.params = params;
        this._requestOptions = _requestOptions;
        this._history = [];
        this._sendPromise = Promise.resolve();
        this._apiKey = apiKey;
        if (params === null || params === void 0 ? void 0 : params.history) {
          validateChatHistory(params.history);
          this._history = params.history;
        }
      }
      /**
       * Gets the chat history so far. Blocked prompts are not added to history.
       * Blocked candidates are not added to history, nor are the prompts that
       * generated them.
       */
      async getHistory() {
        await this._sendPromise;
        return this._history;
      }
      /**
       * Sends a chat message and receives a non-streaming
       * {@link GenerateContentResult}.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async sendMessage(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
          safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
          generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
          tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
          toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
          systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
          cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
          contents: [...this._history, newContent]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        let finalResult;
        this._sendPromise = this._sendPromise.then(() => generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions)).then((result) => {
          var _a2;
          if (isValidResponse(result.response)) {
            this._history.push(newContent);
            const responseContent = Object.assign({
              parts: [],
              // Response seems to come back without a role set.
              role: "model"
            }, (_a2 = result.response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0].content);
            this._history.push(responseContent);
          } else {
            const blockErrorMessage = formatBlockErrorMessage(result.response);
            if (blockErrorMessage) {
              console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
            }
          }
          finalResult = result;
        }).catch((e) => {
          this._sendPromise = Promise.resolve();
          throw e;
        });
        await this._sendPromise;
        return finalResult;
      }
      /**
       * Sends a chat message and receives the response as a
       * {@link GenerateContentStreamResult} containing an iterable stream
       * and a response promise.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async sendMessageStream(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
          safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
          generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
          tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
          toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
          systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
          cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
          contents: [...this._history, newContent]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
        this._sendPromise = this._sendPromise.then(() => streamPromise).catch((_ignored) => {
          throw new Error(SILENT_ERROR);
        }).then((streamResult) => streamResult.response).then((response) => {
          if (isValidResponse(response)) {
            this._history.push(newContent);
            const responseContent = Object.assign({}, response.candidates[0].content);
            if (!responseContent.role) {
              responseContent.role = "model";
            }
            this._history.push(responseContent);
          } else {
            const blockErrorMessage = formatBlockErrorMessage(response);
            if (blockErrorMessage) {
              console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
            }
          }
        }).catch((e) => {
          if (e.message !== SILENT_ERROR) {
            console.error(e);
          }
        });
        return streamPromise;
      }
    };
    GenerativeModel = class {
      constructor(apiKey, modelParams, _requestOptions = {}) {
        this.apiKey = apiKey;
        this._requestOptions = _requestOptions;
        if (modelParams.model.includes("/")) {
          this.model = modelParams.model;
        } else {
          this.model = `models/${modelParams.model}`;
        }
        this.generationConfig = modelParams.generationConfig || {};
        this.safetySettings = modelParams.safetySettings || [];
        this.tools = modelParams.tools;
        this.toolConfig = modelParams.toolConfig;
        this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
        this.cachedContent = modelParams.cachedContent;
      }
      /**
       * Makes a single non-streaming call to the model
       * and returns an object containing a single {@link GenerateContentResponse}.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async generateContent(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContent(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
      }
      /**
       * Makes a single streaming call to the model and returns an object
       * containing an iterable stream that iterates over all chunks in the
       * streaming response as well as a promise that returns the final
       * aggregated response.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async generateContentStream(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContentStream(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
      }
      /**
       * Gets a new {@link ChatSession} instance which can be used for
       * multi-turn chats.
       */
      startChat(startChatParams) {
        var _a;
        return new ChatSession(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, startChatParams), this._requestOptions);
      }
      /**
       * Counts the tokens in the provided request.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async countTokens(request, requestOptions = {}) {
        const formattedParams = formatCountTokensInput(request, {
          model: this.model,
          generationConfig: this.generationConfig,
          safetySettings: this.safetySettings,
          tools: this.tools,
          toolConfig: this.toolConfig,
          systemInstruction: this.systemInstruction,
          cachedContent: this.cachedContent
        });
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
      }
      /**
       * Embeds the provided content.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async embedContent(request, requestOptions = {}) {
        const formattedParams = formatEmbedContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
      }
      /**
       * Embeds an array of {@link EmbedContentRequest}s.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
      }
    };
    GoogleGenerativeAI = class {
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      /**
       * Gets a {@link GenerativeModel} instance for the provided model name.
       */
      getGenerativeModel(modelParams, requestOptions) {
        if (!modelParams.model) {
          throw new GoogleGenerativeAIError(`Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
        }
        return new GenerativeModel(this.apiKey, modelParams, requestOptions);
      }
      /**
       * Creates a {@link GenerativeModel} instance from provided content cache.
       */
      getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
        if (!cachedContent.name) {
          throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
        }
        if (!cachedContent.model) {
          throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
        }
        const disallowedDuplicates = ["model", "systemInstruction"];
        for (const key of disallowedDuplicates) {
          if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) && cachedContent[key] && (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
            if (key === "model") {
              const modelParamsComp = modelParams.model.startsWith("models/") ? modelParams.model.replace("models/", "") : modelParams.model;
              const cachedContentComp = cachedContent.model.startsWith("models/") ? cachedContent.model.replace("models/", "") : cachedContent.model;
              if (modelParamsComp === cachedContentComp) {
                continue;
              }
            }
            throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
          }
        }
        const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), { model: cachedContent.model, tools: cachedContent.tools, toolConfig: cachedContent.toolConfig, systemInstruction: cachedContent.systemInstruction, cachedContent });
        return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
      }
    };
  }
});

// lambda/analyze/index.mjs
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";
import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";
import {
  S3Client,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
var REGION = process.env.AWS_REGION || "us-east-1";
var TABLE = process.env.DYNAMODB_TABLE || "appready";
var bedrock = new BedrockRuntimeClient({ region: REGION });
var db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
var secrets = new SecretsManagerClient({ region: REGION });
var s3 = new S3Client({ region: REGION });
var S3_BUCKET = process.env.S3_BUCKET;
var cachedGeminiKey = null;
async function getGeminiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  if (cachedGeminiKey) return cachedGeminiKey;
  const res = await secrets.send(new GetSecretValueCommand({ SecretId: "luminetic/gemini-api-key" }));
  const key = res.SecretString ? JSON.parse(res.SecretString).GEMINI_API_KEY : null;
  if (!key) throw new Error("Gemini API key not found");
  cachedGeminiKey = key;
  return key;
}
async function updateScanStatus(userId, scanSK, status, extra = {}) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: scanSK },
    UpdateExpression: "SET #s = :s, updatedAt = :now" + Object.keys(extra).map((k, i) => `, #e${i} = :e${i}`).join(""),
    ExpressionAttributeNames: {
      "#s": "status",
      ...Object.fromEntries(Object.keys(extra).map((k, i) => [`#e${i}`, k]))
    },
    ExpressionAttributeValues: {
      ":s": status,
      ":now": (/* @__PURE__ */ new Date()).toISOString(),
      ...Object.fromEntries(Object.entries(extra).map(([k, v], i) => [`:e${i}`, v]))
    }
  }));
}
var GEMINI_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst. You analyze .ipa app metadata to identify potential App Store Review Guideline violations, missing configurations, and submission risks BEFORE the developer submits to Apple.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Info.plist configuration requirements
- Privacy and data collection requirements (NSUsageDescriptions, ATT)
- In-App Purchase and StoreKit requirements
- Entitlements and capabilities
- Framework/SDK compliance issues
- Common rejection patterns

Analyze the metadata for issues and respond ONLY with valid JSON (no markdown, no backticks):

{
  "guidelines_referenced": [{ "section": "e.g. 2.1", "name": "e.g. App Completeness", "description": "Brief description" }],
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What metadata indicates this", "guideline_section": "e.g. 2.1" }],
  "action_plan": [{ "priority": 1, "action": "Specific action", "details": "Step-by-step guidance", "estimated_effort": "e.g. 1-2 hours" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
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
}`;
var DEEPSEEK_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst. You analyze .ipa metadata to find App Store Review Guideline violations.

CRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object. Do NOT include any text, explanation, or markdown before or after the JSON. Do NOT start with "Let's", "Sure", "Here", or any other word. Your entire response must be parseable by JSON.parse().

Respond with this exact JSON structure:

{
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What metadata indicates this", "guideline_section": "e.g. 2.1", "reasoning": "Step-by-step reasoning" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`;
var SONNET_SYSTEM_PROMPT = `You are a meticulous iOS App Store review compliance analyst. Analyze the provided .ipa metadata independently for App Store Review Guideline compliance.

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "validation": {
    "confirmed_issues": ["..."],
    "disputed_issues": [{ "original_issue": "...", "dispute_reason": "...", "correction": "..." }],
    "missed_issues": [{ "severity": "critical"|"major"|"minor", "issue": "...", "guideline_section": "...", "evidence": "...", "action": "..." }]
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
}`;
var OPUS_JUDGE_PROMPT = `You are the final-stage senior App Store review analyst. You reconcile findings from three independent AI analyses (Gemini, DeepSeek, Claude Sonnet) to produce the authoritative final assessment.

Your job:
- RECONCILE all findings \u2014 confirm agreements, resolve disagreements
- Produce the FINAL action plan with confidence levels
- Assign the FINAL readiness score (0-100)
- Generate App Store reviewer notes

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "refined_action_plan": [{ "priority": 1, "action": "...", "details": "...", "estimated_effort": "...", "confidence": "high"|"medium"|"low", "source": "gemini_confirmed"|"sonnet_added"|"opus_refined"|"deepseek_added" }],
  "final_assessment": { "score": 0-100, "confidence": "high"|"medium"|"low", "summary": "...", "agreement_level": "full"|"partial"|"significant_disagreement", "risk_factors": ["..."] },
  "review_packet_notes": {
    "testing_steps": ["Step-by-step testing instructions for Apple reviewer"],
    "reviewer_notes": "Notes to include in the App Store Connect reviewer notes field",
    "known_limitations": ["Any known limitations to disclose"]
  }
}`;
async function callGemini(context) {
  const start = Date.now();
  try {
    const apiKey = await getGeminiKey();
    const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
    const genAI = new GoogleGenerativeAI2(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    });
    const result = await model.generateContent([
      { text: GEMINI_SYSTEM_PROMPT },
      { text: `Analyze this iOS app's metadata for App Store Review compliance:

${context}` }
    ]);
    const raw = result.response.text();
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Gemini error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}
async function callDeepSeek(context) {
  const start = Date.now();
  try {
    const payload = {
      max_tokens: 8192,
      temperature: 0.2,
      system: DEEPSEEK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this iOS app metadata for App Store compliance. Respond with ONLY valid JSON:

${context}` }]
    };
    const cmd = new InvokeModelCommand({
      modelId: "deepseek.v3.2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.choices?.[0]?.message?.content || body?.content?.[0]?.text || null;
    if (!raw) throw new Error("Empty response from DeepSeek");
    const cleaned = (typeof raw === "string" ? raw : JSON.stringify(raw)).replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[DeepSeek error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}
async function callSonnet(context) {
  const start = Date.now();
  try {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.2,
      system: SONNET_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `APP METADATA:
${context}

Analyze this iOS app's metadata for App Store Review compliance.` }]
    };
    const cmd = new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-6",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.content?.[0]?.text;
    if (!raw) throw new Error("Empty response from Sonnet");
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Sonnet error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}
async function callOpus(context, geminiData, deepseekData, sonnetData) {
  const start = Date.now();
  try {
    const userMessage = `APP METADATA:
${context}

GEMINI ANALYSIS:
${JSON.stringify(geminiData, null, 2)}

DEEPSEEK ANALYSIS:
${JSON.stringify(deepseekData, null, 2)}

CLAUDE SONNET ANALYSIS:
${JSON.stringify(sonnetData, null, 2)}

Reconcile all findings and produce the final assessment.`;
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.2,
      system: OPUS_JUDGE_PROMPT,
      messages: [{ role: "user", content: userMessage }]
    };
    const cmd = new InvokeModelCommand({
      modelId: "us.anthropic.claude-opus-4-6-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.content?.[0]?.text;
    if (!raw) throw new Error("Empty response from Opus");
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Opus error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}
function parseScore(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d+(\.\d+)?)/);
    if (m) {
      const n = Math.round(parseFloat(m[1]));
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
    }
  }
  return null;
}
function heuristicScore(issues) {
  if (!issues.length) return 72;
  let penalty = 0;
  for (const i of issues) {
    const sev = String(i?.severity || "minor").toLowerCase();
    if (sev === "critical") penalty += 20;
    else if (sev === "major") penalty += 10;
    else penalty += 3;
  }
  return Math.max(10, Math.min(95, 100 - Math.min(90, penalty)));
}
function resolveScore(geminiAssessment, opusFinal, allIssues, anyOk) {
  const gs = parseScore(geminiAssessment?.score) ?? parseScore(geminiAssessment?.readiness_score);
  const os = parseScore(opusFinal?.score) ?? parseScore(opusFinal?.readiness_score);
  if (gs != null && os != null) {
    const b = Math.round(gs * 0.3 + os * 0.7);
    if (b > 0) return b;
  }
  if (os != null && os > 0) return os;
  if (gs != null && gs > 0) return gs;
  if (allIssues.length > 0) return heuristicScore(allIssues);
  if (anyOk) return 65;
  return 0;
}
function mergeResults({ gemini, deepseek, sonnet, opus, context, ipaMetadata, totalStart }) {
  const geminiData = gemini.data;
  const deepseekData = deepseek.data;
  const sonnetData = sonnet.data;
  const opusData = opus.data;
  const confirmedIssues = geminiData?.issues_identified || [];
  const deepseekIssues = deepseekData?.issues_identified || [];
  const geminiTexts = new Set(confirmedIssues.map((i) => (i?.issue || "").toLowerCase().slice(0, 60)));
  const uniqueDeepseek = deepseekIssues.filter((i) => !geminiTexts.has((i?.issue || "").toLowerCase().slice(0, 60)));
  const sonnetMissed = sonnetData?.validation?.missed_issues || [];
  const sonnetDisputed = sonnetData?.validation?.disputed_issues || [];
  const disputedSet = new Set(sonnetDisputed.map((d) => d?.original_issue));
  const allIssues = [
    ...confirmedIssues.filter((i) => !disputedSet.has(i?.issue)),
    ...uniqueDeepseek.map((i) => ({ ...i, source: "deepseek_added" })),
    ...sonnetDisputed.map((d) => ({ severity: "major", issue: d?.correction, evidence: d?.dispute_reason, source: "sonnet_corrected" })),
    ...sonnetMissed.map((i) => ({ ...i, source: "sonnet_added" }))
  ];
  const opusFinal = opusData?.final_assessment || null;
  const geminiAssessment = geminiData?.readiness_assessment || null;
  const anyOk = gemini.success || deepseek.success || sonnet.success || opus.success;
  const finalScore = resolveScore(geminiAssessment, opusFinal, allIssues, anyOk);
  const gPre = geminiData?.preflight_checks || {};
  const dPre = deepseekData?.preflight_checks || {};
  const sPre = sonnetData?.refined_preflight || {};
  const mergedPreflight = { ...gPre, ...dPre, ...sPre };
  const reviewPacket = opusData?.review_packet_notes || {};
  return {
    guidelines: geminiData?.guidelines_referenced || [],
    issues: allIssues,
    action_plan: opusData?.refined_action_plan || geminiData?.action_plan || [],
    assessment: {
      score: finalScore,
      confidence: opusFinal?.confidence || "medium",
      summary: opusFinal?.summary || geminiAssessment?.summary || "Analysis completed.",
      agreement_level: opusFinal?.agreement_level || "partial",
      risk_factors: opusFinal?.risk_factors || geminiAssessment?.risk_factors || []
    },
    preflight: mergedPreflight,
    review_packet: reviewPacket,
    ipa_metadata: ipaMetadata || null,
    meta: {
      models_used: [gemini.success && "gemini", deepseek.success && "deepseek", sonnet.success && "sonnet", opus.success && "opus"].filter(Boolean),
      gemini_latency_ms: gemini.latency,
      deepseek_latency_ms: deepseek.latency,
      sonnet_latency_ms: sonnet.latency,
      opus_latency_ms: opus.latency,
      total_latency_ms: Date.now() - totalStart,
      gemini_success: gemini.success,
      deepseek_success: deepseek.success,
      sonnet_success: sonnet.success,
      opus_success: opus.success
    }
  };
}
var handler = async (event) => {
  const { userId, scanSK, scanId, contextForAI, ipaMetadata, s3Key, bundleId } = event;
  const totalStart = Date.now();
  try {
    await updateScanStatus(userId, scanSK, "analyzing");
    const [gemini, sonnet, deepseek] = await Promise.all([
      callGemini(contextForAI),
      callSonnet(contextForAI),
      callDeepSeek(contextForAI)
    ]);
    console.log(`[Stage 1] Gemini=${gemini.success}(${gemini.latency}ms) Sonnet=${sonnet.success}(${sonnet.latency}ms) DeepSeek=${deepseek.success}(${deepseek.latency}ms)`);
    if (!gemini.success && !sonnet.success && !deepseek.success) {
      await updateScanStatus(userId, scanSK, "error", {
        errorMessage: "All AI models failed in Stage 1. Please try again."
      });
      return { statusCode: 500, body: "All Stage 1 models failed" };
    }
    await updateScanStatus(userId, scanSK, "reconciling");
    const opus = await callOpus(contextForAI, gemini.data, deepseek.data, sonnet.data);
    console.log(`[Stage 2] Opus=${opus.success}(${opus.latency}ms)`);
    const merged = mergeResults({ gemini, deepseek, sonnet, opus, contextForAI, ipaMetadata, totalStart });
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: scanSK },
      UpdateExpression: "SET #s = :s, mergedResult = :mr, geminiResult = :gr, deepseekResult = :dr, claudeResult = :cr, sonnetResult = :sr, score = :sc, updatedAt = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": "complete",
        ":mr": merged,
        ":gr": gemini.data,
        ":dr": deepseek.data,
        ":cr": opus.data,
        ":sr": sonnet.data,
        ":sc": merged.assessment.score,
        ":now": (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
      UpdateExpression: "ADD scanCount :inc SET updatedAt = :now",
      ExpressionAttributeValues: { ":inc": 1, ":now": (/* @__PURE__ */ new Date()).toISOString() }
    }));
    if (s3Key && S3_BUCKET) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
        console.log(`[Cleanup] Deleted s3://${S3_BUCKET}/${s3Key}`);
      } catch (delErr) {
        console.warn(`[Cleanup] Failed to delete IPA (non-fatal):`, delErr);
      }
    }
    console.log(`[Done] scanId=${scanId} score=${merged.assessment.score} total=${Date.now() - totalStart}ms`);
    return { statusCode: 200, body: JSON.stringify({ scanId, score: merged.assessment.score }) };
  } catch (err) {
    console.error("[Lambda fatal]", err);
    await updateScanStatus(userId, scanSK, "error", {
      errorMessage: "Analysis failed unexpectedly. Please try again."
    }).catch(() => {
    });
    return { statusCode: 500, body: String(err) };
  }
};
export {
  handler
};
/*! Bundled license information:

@google/generative-ai/dist/index.mjs:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
