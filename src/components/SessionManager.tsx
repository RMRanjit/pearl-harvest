// src/components/SessionManager.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  isValidFolderName,
  Session,
  getSessions,
  createSession,
  deleteSession,
} from "@/lib/SessionUtils";

interface SessionManagerProps {
  onSessionChange: (sessionId: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ onSessionChange }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const loadedSessions = await getSessions();
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
          setCurrentSessionId(loadedSessions[0].id);
          onSessionChange(loadedSessions[0].id);
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
        toast.error("Failed to load sessions. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  const handleCreateSession = async () => {
    console.log(
      "SessionManager: handleCreateSession: sessionName",
      newSessionName
    );

    if (!isValidFolderName(newSessionName) || newSessionName.trim() === "") {
      toast.error("Invalid session name. Please avoid special characters.");
      return;
    }

    // Check if a session with the same name already exists
    if (
      sessions.some(
        (session) => session.name.toLowerCase() === newSessionName.toLowerCase()
      )
    ) {
      toast.error(
        "A session with this name already exists. Please choose a different name."
      );
      return;
    }

    try {
      const newSession = await createSession(newSessionName);
      setSessions([...sessions, newSession]);
      setNewSessionName("");
      setCurrentSessionId(newSession.id);
      onSessionChange(newSession.id);
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create session. Please try again.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const success = await deleteSession(sessionId);
      if (success) {
        const updatedSessions = sessions.filter(
          (session) => session.id !== sessionId
        );
        setSessions(updatedSessions);
        if (sessionId === currentSessionId) {
          const mostRecentSession = updatedSessions[updatedSessions.length - 1];
          if (mostRecentSession) {
            setCurrentSessionId(mostRecentSession.id);
            onSessionChange(mostRecentSession.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session. Please try again.");
    }
  };

  const handleSessionChange = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    onSessionChange(sessionId);
  };

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            type="text"
            placeholder="New session name"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
          />
          <Button onClick={handleCreateSession}>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
        <ScrollArea className="h-[200px]">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-2 mb-2 rounded ${
                session.id === currentSessionId
                  ? "bg-primary-foreground"
                  : "bg-secondary"
              }`}
            >
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSessionChange(session.id)}
              >
                {session.name}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteSession(session.id)}
                disabled={sessions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SessionManager;
