"use client";

import ChatWindow from "@/components/ChatWindow";
import FileUpload from "@/components/FileUpload";
// import SessionManager from "@/components/SessionManager";
import SessionManager from "@/components/SessionManager";
import SummaryTable from "@/components/SummaryTable";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState, useCallback } from "react";

import { toast } from "react-hot-toast";

interface ProcessedFile {
  sessionId: string;
  fileName: string;
  summary: string;
  citation: string;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [operations, setOperations] = useState([
    { id: "upload", label: "File Upload", progress: 0 },
    { id: "process", label: "File Processing", progress: 0 },
    { id: "vectorize", label: "Vectorization", progress: 0 },
  ]);

  const handleProcessFiles = async () => {
    try {
      // updateOperationProgress("process", 0);
      // const processed = await processFiles(files, selectedModel);
      // setProcessedFiles(processed);
      // updateOperationProgress("process", 100);

      // updateOperationProgress("vectorize", 0);
      // await addDocumentsToVectorStore(
      //   processed.map((pf) => ({
      //     pageContent: pf.summary,
      //     metadata: { fileName: pf.fileName, citation: pf.citation },
      //   }))
      // );
      // updateOperationProgress("vectorize", 100);

      // toast.success("Files processed and vectorized successfully!");
      toast.success("Session loaded successfully!");
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("An error occurred while processing files.");
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    // clearVectorStore();
    resetOperationProgress();
    // toast.success("All files cleared and vector store reset.");
  };

  const handleSessionChange = (sessionId: string) => {
    console.log("Page: handleSessionChange", sessionId);
    setCurrentSessionId(sessionId);
    handleClearFiles();
  };

  const handleNewSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    handleClearFiles();
  };

  const updateOperationProgress = (operationId: string, progress: number) => {
    setOperations((prevOps) =>
      prevOps.map((op) => (op.id === operationId ? { ...op, progress } : op))
    );
  };

  const resetOperationProgress = () => {
    setOperations((ops) => ops.map((op) => ({ ...op, progress: 0 })));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Select the Session </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionManager
              onSessionChange={handleSessionChange}
              // onNewSession={handleNewSession}
            />
            {/* 
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            /> */}
          </CardContent>
        </Card>
        {/* {fileUpload(
          getRootProps,
          getInputProps,
          isDragActive,
          files,
          handleProcessFiles
        )} */}
        <FileUpload
          onFileUpload={handleProcessFiles}
          currentSessionId={currentSessionId}
        />

        {/* <Card className="col-span-2">
          <SummaryTable summaries={[]} />
        </Card> */}
        <Card className="col-span-2">
          <ChatWindow sessionId={currentSessionId} />
        </Card>
      </div>
    </div>
  );
}
