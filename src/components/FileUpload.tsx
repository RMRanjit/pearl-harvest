import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSessionFiles,
  uploadFile,
  deleteFile,
  processSessionFiles,
} from "@/lib/SessionUtils";
import { Loader, X } from "lucide-react";

const MAX_FILES = parseInt(process.env.NEXT_PUBLIC_MAX_FILES || "40", 10);
const MAX_FILE_SIZE = parseInt(
  process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "52428800",
  10
); // 50MB in bytes

interface FileUploadProps {
  currentSessionId: string;
  onFileUpload: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  currentSessionId,
  onFileUpload,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [findingFiles, setFindingFiles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const loadExistingFiles = async () => {
    if (!currentSessionId) return;
    setFindingFiles(true);
    try {
      const sessionFiles = await getSessionFiles(currentSessionId);
      setExistingFiles(sessionFiles);
    } catch (error) {
      console.error("Failed to load existing files:", error);
      toast.error("Failed to load existing files");
    }
    setFindingFiles(false);
  };

  useEffect(() => {
    console.log("FileUpload: useEffect: currentSessionId", currentSessionId);

    if (currentSessionId) {
      loadExistingFiles();
    }
  }, [currentSessionId]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > MAX_FILES) {
        toast.error(`You can only upload a maximum of ${MAX_FILES} files.`);
        return;
      }

      const validFiles = acceptedFiles.filter(
        (file) => file.size <= MAX_FILE_SIZE
      );
      if (validFiles.length < acceptedFiles.length) {
        toast.error(
          `Some files were skipped because they exceed the ${
            MAX_FILE_SIZE / 1048576
          }MB limit.`
        );
      }

      setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    },
    [files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);

    const totalFiles = files.length;
    let uploadedFiles = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", currentSessionId);

        await uploadFile(formData);
        uploadedFiles++;
        setProgress((uploadedFiles / totalFiles) * 100);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setFiles([]);
    onFileUpload(files);
    loadExistingFiles(); // Reload the list of existing files
    toast.success("Files uploaded successfully");
  };

  const removeSelectedFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (fileName: string) => {
    try {
      await deleteFile(currentSessionId, fileName);
      toast.success(`Deleted ${fileName}`);
      loadExistingFiles();
    } catch (error) {
      console.error(`Failed to delete file ${fileName}:`, error);
      toast.error(`Failed to delete ${fileName}`);
    }
  };

  const handleProcessFiles = async () => {
    if (!currentSessionId || existingFiles.length === 0) return;

    setProcessing(true);

    try {
      await processSessionFiles(currentSessionId);
      toast.success("Files processed successfully");
    } catch (error) {
      console.error("Failed to process files:", error);
      toast.error("Failed to process files");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>2. Upload Files</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="h-full flex flex-col">
          <div
            {...getRootProps()}
            className="border-2 border-dotted border-gray-300 p-6 mb-4 cursor-pointer"
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag and drop some files here, or click to <u>select</u> files
              </p>
            )}
          </div>
          <div className="my-4">
            {files.map((file, index) => (
              <Badge
                key={index}
                className="p-1 mr-2 mb-2 inline-flex items-center"
              >
                {file.name}
                {existingFiles.includes(file.name) && " (will overwrite)"}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 p-0"
                  onClick={() => removeSelectedFile(index)}
                >
                  <X size={14} />
                </Button>
              </Badge>
            ))}
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            Upload
          </Button>
          {uploading && <progress value={progress} max="100" />}
          <div className="mt-4 flex-grow">
            {findingFiles ? (
              <Loader className="h-8 w-8 animate-spin" />
            ) : existingFiles.length > 0 ? (
              <>
                <h3>Existing Files</h3>
                {existingFiles.map((fileName, index) => (
                  <Badge
                    key={index}
                    className="h-6 mr-2 mb-2 inline-flex items-center"
                  >
                    {fileName}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 p-0"
                      onClick={() => handleDeleteExistingFile(fileName)}
                    >
                      <X size={14} />
                    </Button>
                  </Badge>
                ))}
              </>
            ) : (
              <div>No files uploaded yet</div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <div className="w-full flex items-center">
          <Button
            onClick={handleProcessFiles}
            disabled={processing || existingFiles.length === 0}
            className="flex-grow"
          >
            Process Files
          </Button>
          {processing && (
            <div className="ml-4">
              <span>{Math.round(processingProgress)}%</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
