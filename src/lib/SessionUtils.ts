// /lib/sessionUtils.ts
"use server";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "fs/promises";
import path from "path";
import { unstable_parseMultipartFormData } from "next/server";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import {
  AzureChatOpenAI,
  AzureOpenAIEmbeddings,
  OpenAIEmbeddings,
} from "@langchain/openai";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export interface Session {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Citation {
  source: string;
  page?: number;
}

interface ExecutePromptResult {
  generatedText: string;
  citations: Citation[];
}

const uploadFolder = process.env.UPLOAD_FOLDER || "";
const isAzureBlob = uploadFolder.startsWith("https://");

export async function getSessions(): Promise<Session[]> {
  if (isAzureBlob) {
    return getSessionsFromAzureBlob();
  } else {
    return getSessionsFromLocalFolder();
  }
}

export async function getSessionFiles(sessionId: string): Promise<string[]> {
  if (isAzureBlob) {
    return getSessionFilesFromAzureBlob(sessionId);
  } else {
    return getSessionFilesFromLocalFolder(sessionId);
  }
}

async function getSessionsFromAzureBlob(): Promise<Session[]> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  const blobs = containerClient.listBlobsFlat();

  const sessionsList: Session[] = [];
  for await (const blob of blobs) {
    if (blob.name.endsWith("/")) {
      // It's a folder
      sessionsList.push({
        id: blob.name,
        name: blob.name.slice(0, -1), // Remove trailing slash
        createdAt: blob.properties.createdOn || new Date(),
      });
    }
  }
  return sessionsList;
}

async function getSessionFilesFromAzureBlob(
  sessionId: string
): Promise<string[]> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  const blobs = containerClient.listBlobsFlat({ prefix: `${sessionId}/` });

  const fileNames: string[] = [];
  for await (const blob of blobs) {
    const fileName = path.basename(blob.name);
    if (
      !blob.name.endsWith("/") &&
      !fileName.endsWith(".json") &&
      !fileName.endsWith("faiss.index")
    ) {
      // Exclude directories, .json files, and faiss.index files
      fileNames.push(path.basename(blob.name));
    }
  }
  return fileNames;
}

async function getSessionsFromLocalFolder(): Promise<Session[]> {
  const appPath: string = await process.cwd();
  console.log("appPath", appPath);
  const uploadPath = appPath.concat(uploadFolder);

  //   console.log("Getting sessions from local folder", uploadPath);

  const folders = await fs.readdir(uploadPath, {
    withFileTypes: true,
  });
  return Promise.all(
    folders
      .filter((dirent) => dirent.isDirectory())
      .map(async (dirent) => {
        const stats = await fs.stat(path.join(uploadPath, dirent.name));
        return {
          id: dirent.name,
          name: dirent.name,
          createdAt: stats.mtime,
        };
      })
  );
}

async function getSessionFilesFromLocalFolder(
  sessionId: string
): Promise<string[]> {
  const appPath: string = await process.cwd();
  console.log("appPath", appPath);
  const uploadPath = appPath.concat(uploadFolder);
  const sessionFolder = path.join(uploadPath, sessionId);

  try {
    const files = await fs.readdir(sessionFolder);
    const filteredFiles = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(sessionFolder, file);
        const stat = await fs.lstat(filePath);
        if (
          stat.isFile() &&
          !file.endsWith(".json") &&
          !file.endsWith("faiss.index")
        ) {
          return file;
        }
        return null;
      })
    );
    return filteredFiles.filter((file): file is string => file !== null);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []; // Return empty array if folder doesn't exist
    }
    throw error;
  }
}
export async function createSession(sessionName: string): Promise<Session> {
  console.log("Creating session", sessionName);
  if (isAzureBlob) {
    return createSessionInAzureBlob(sessionName);
  } else {
    return createSessionInLocalFolder(sessionName);
  }
}

async function createSessionInAzureBlob(sessionName: string): Promise<Session> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(
    `${sessionName}/.keep`
  );
  await blockBlobClient.upload("", 0);
  return { id: sessionName, name: sessionName, createdAt: new Date() };
}

async function createSessionInLocalFolder(
  sessionName: string
): Promise<Session> {
  const appPath: string = await process.cwd();
  console.log("appPath", appPath);
  const uploadPath = appPath.concat(uploadFolder);

  console.log("Creating session local folder", uploadPath);

  console.log("Creating session in local folder", sessionName, uploadPath);
  await fs.mkdir(path.join(uploadPath, sessionName), { recursive: true });
  return { id: sessionName, name: sessionName, createdAt: new Date() };
}

export async function uploadFileX(
  sessionId: string,
  file: File
): Promise<void> {
  console.log("sessionUtils: uploadFile: Uploading file", file.name);
  if (isAzureBlob) {
    await uploadFileToAzureBlob(sessionId, file);
  } else {
    await uploadFileToLocalFolder(sessionId, file);
  }
}

export async function uploadFile(formData: FormData): Promise<void> {
  const file = formData.get("file") as File;
  const sessionId = formData.get("sessionId") as string;

  if (!file || !sessionId) {
    throw new Error("File or sessionId is missing");
  }

  console.log("sessionUtils: uploadFile: Uploading file", file.name);

  if (isAzureBlob) {
    await uploadFileToAzureBlob(sessionId, file);
  } else {
    await uploadFileToLocalFolder(sessionId, file);
  }
}

async function uploadFileToLocalFolder(
  sessionId: string,
  file: File
): Promise<void> {
  const appPath: string = await process.cwd();
  console.log("uploadFileToLocalFolder: appPath", appPath);
  const uploadPath = appPath.concat(uploadFolder);

  const sessionFolder = path.join(uploadPath, sessionId);
  await fs.mkdir(sessionFolder, { recursive: true });

  const filePath = path.join(sessionFolder, file.name);
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
}

async function uploadFileToAzureBlob(
  sessionId: string,
  file: File
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  const blobClient = containerClient.getBlockBlobClient(
    `${sessionId}/${file.name}`
  );

  const arrayBuffer = await file.arrayBuffer();
  await blobClient.upload(arrayBuffer, arrayBuffer.byteLength);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  if (isAzureBlob) {
    return deleteSessionFromAzureBlob(sessionId);
  } else {
    return deleteSessionFromLocalFolder(sessionId);
  }
}

async function deleteSessionFromAzureBlob(sessionId: string): Promise<boolean> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  const blobs = containerClient.listBlobsFlat({ prefix: sessionId });
  for await (const blob of blobs) {
    await containerClient.deleteBlob(blob.name);
  }
  return true;
}

async function deleteSessionFromLocalFolder(
  sessionId: string
): Promise<boolean> {
  const appPath: string = await process.cwd();
  console.log("Delete appPath", appPath);
  const uploadPath = appPath.concat(uploadFolder);
  await fs.rm(path.join(uploadPath, sessionId), {
    recursive: true,
    force: true,
  });
  return true;
}

export async function deleteFile(
  sessionId: string,
  fileName: string
): Promise<void> {
  console.log("sessionUtils: deleteFile: Deleting file", fileName);

  if (isAzureBlob) {
    await deleteFileFromAzureBlob(sessionId, fileName);
  } else {
    await deleteFileFromLocalFolder(sessionId, fileName);
  }
}
async function deleteFileFromLocalFolder(
  sessionId: string,
  fileName: string
): Promise<void> {
  const appPath: string = await process.cwd();
  const uploadPath = appPath.concat(uploadFolder);
  const filePath = path.join(uploadPath, sessionId, fileName);

  try {
    await fs.unlink(filePath);
    console.log(`File ${fileName} deleted successfully from local folder`);
  } catch (error) {
    console.error(`Error deleting file ${fileName} from local folder:`, error);
    throw error;
  }
}

async function deleteFileFromAzureBlob(
  sessionId: string,
  fileName: string
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);
  const blobClient = containerClient.getBlockBlobClient(
    `${sessionId}/${fileName}`
  );

  try {
    await blobClient.delete();
    console.log(`Deleted file: ${sessionId}/${fileName}`);
  } catch (error) {
    console.error(`Error deleting file ${sessionId}/${fileName}:`, error);
    throw error;
  }
}

export async function processSessionFiles(sessionId: string): Promise<void> {
  console.log(
    "sessionUtils: processSessionFiles: Processing files for session",
    sessionId
  );

  if (isAzureBlob) {
    await processFilesFromAzureBlob(sessionId);
  } else {
    await processFilesFromLocalFolder(sessionId);
  }
}

async function processFilesFromLocalFolder(sessionId: string): Promise<void> {
  const appPath: string = process.cwd();
  const uploadPath = path.join(appPath, uploadFolder);
  const sessionFolderPath = path.join(uploadPath, sessionId);

  try {
    await processFiles(sessionFolderPath, sessionId);
    console.log(
      `Files processed successfully for session ${sessionId} from local folder`
    );
  } catch (error) {
    console.error(
      `Error processing files for session ${sessionId} from local folder:`,
      error
    );
    throw error;
  }
}

async function processFilesFromAzureBlob(sessionId: string): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ""
  );
  const containerClient = blobServiceClient.getContainerClient(uploadFolder);

  try {
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), "temp-"));
    const blobs = containerClient.listBlobsFlat({ prefix: sessionId });

    for await (const blob of blobs) {
      const blobClient = containerClient.getBlobClient(blob.name);
      const downloadBlockBlobResponse = await blobClient.download();
      const fileName = path.basename(blob.name);
      const filePath = path.join(tempDir, fileName);

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath);
        downloadBlockBlobResponse
          .readableStreamBody!.pipe(fileStream)
          .on("error", reject)
          .on("finish", resolve);
      });
    }

    await processFiles(tempDir, sessionId);

    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(
      `Files processed successfully for session ${sessionId} from Azure Blob`
    );
  } catch (error) {
    console.error(
      `Error processing files for session ${sessionId} from Azure Blob:`,
      error
    );
    throw error;
  }
}

async function processFilesAzureOpenAI(
  folderPath: string,
  sessionId: string
): Promise<void> {
  const loader = new DirectoryLoader(folderPath, {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });

  const docs = await loader.load();

  console.log("Docs loaded ");

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);

  console.log("splitDocs Completed...");

  // const embeddings = new AzureOpenAIEmbeddings({
  //   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  //   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  //   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  //   azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  //   azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-3-large",
  // });

  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

  const saveDirectory = path.join(process.cwd(), "vector_stores", sessionId);
  await fs.mkdir(saveDirectory, { recursive: true });
  await vectorStore.save(saveDirectory);

  console.log(
    `Processed ${splitDocs.length} documents for session ${sessionId}`
  );
}

async function processFiles(
  folderPath: string,
  sessionId: string
): Promise<void> {
  console.log("processFiles", folderPath);
  const loader = new DirectoryLoader(folderPath, {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });

  console.log("After loader");
  const docs = await loader.load();

  console.log("After loading docs");

  console.log("Docs loaded ");

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);

  console.log("splitDocs Completed...");

  // Initialize Azure OpenAI Embeddings
  const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiEmbeddingsDeploymentName:
      process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  });

  // const embeddings = new GoogleGenerativeAIEmbeddings({
  //   model: "embedding-001", // 768 dimensions
  //   // taskType: TaskType.RETRIEVAL_DOCUMENT,
  //   // title: "Document title",
  // });

  const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

  // const saveDirectory = path.join(process.cwd(), "vector_stores", sessionId);
  // await fs.mkdir(saveDirectory, { recursive: true });
  // await vectorStore.save(saveDirectory);
  await vectorStore.save(folderPath);
  console.log("Vector store saved", folderPath);

  // const result = await vectorStore.similaritySearchWithScore(
  //   "What are these documents?",
  //   2
  // );
  // console.log("Similarity search result", result);

  console.log(
    `Processed ${splitDocs.length} documents for session ${sessionId}`
  );
}

export async function executePrompt(
  sessionId: string,
  prompt: string
): Promise<ExecutePromptResult> {
  const appPath: string = process.cwd();
  const uploadPath = path.join(appPath, uploadFolder);
  const sessionFolderPath = path.join(uploadPath, sessionId);

  try {
    // Initialize Azure OpenAI Embeddings
    const embeddings = new AzureOpenAIEmbeddings({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      azureOpenAIApiDeploymentName:
        process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    // const embeddings = new GoogleGenerativeAIEmbeddings({
    //   model: "embedding-001", // 768 dimensions
    //   // taskType: TaskType.RETRIEVAL_DOCUMENT,
    //   // title: "Document title",
    // });

    // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

    // Load the vector store
    // const vectorStoreDir = path.join(process.cwd(), "vector_stores", sessionId);
    const vectorStore = await FaissStore.load(sessionFolderPath, embeddings);

    // Perform a similarity search to get relevant context
    const searchResults = await vectorStore.similaritySearch(prompt, 5);

    const context = searchResults
      .map((result) => result.pageContent)
      .join("\n\n");
    const citations: Citation[] = searchResults.map((result) => ({
      source: result.metadata.source,
      page: result.metadata.page,
    }));

    // Prepare the prompt with context and instructions for citations
    const fullPrompt = `
    Context:
    ${context}

    Question: ${prompt}

    Instructions:
    1. Answer the question based on the provided context.
    2. If you use specific information from the context, indicate the source using [1], [2], etc., corresponding to the order of the sources in the context.
    3. In the end. provide references to the source indicated by [1], [2] with the document name, page number and section
    4. If you're unsure or the information is not in the context, say so.

    Answer:`;

    //     const fullPrompt = ` You are business development proposal writer. You have the context as ${context} which is a request for proposal from the client. Read through the docucment and provide the following
    //     Question: ${prompt}
    // 1. Write the win themes for the document
    // 2. Provide the sections for the response and content for the response
    // 3. Provide a team structure with roles and accountabilities in the response
    // 4. What should be the deliverables for the proposal`;

    // Execute the prompt using Gemini
    // const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    // const result = await model.generateContent(fullPrompt);
    // const response = await result.response;
    // const generatedText = response.text();
    // const llm = new ChatGoogleGenerativeAI({
    //   model: "gemini-1.5-pro",
    //   temperature: 0,
    //   maxRetries: 2,
    //   // other params...
    // });
    console.log("fullPrompt", fullPrompt);
    const llm = new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiDeploymentName:
        process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    });

    console.log("llm initiated");
    const result = await llm.invoke(fullPrompt);
    const generatedText = await result.content.toLocaleString();

    return { generatedText, citations };
  } catch (error) {
    console.error("Error executing prompt:", error);
    throw new Error(`Failed to execute prompt: ${(error as Error).message}`);
  }
}

export async function isValidFolderName(name: string): boolean {
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  return !invalidChars.test(name) && name.trim() !== "";
}
