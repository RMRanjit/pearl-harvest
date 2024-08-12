import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Summary {
  fileName: string;
  summary: string;
  citation: string;
}

const SummaryTable: React.FC<{ summaries: Summary[] }> = ({ summaries }) => {
  const [sortField, setSortField] = useState<keyof Summary>("fileName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedSummaries = [...summaries].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Summary) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead onClick={() => handleSort("fileName")}>
            File Name
          </TableHead>
          <TableHead onClick={() => handleSort("summary")}>Summary</TableHead>
          <TableHead onClick={() => handleSort("citation")}>Citation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSummaries.map((summary, index) => (
          <TableRow key={index}>
            <TableCell>{summary.fileName}</TableCell>
            <TableCell>{summary.summary}</TableCell>
            <TableCell>{summary.citation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SummaryTable;
