"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddProjectDialog } from "./add-project-dialog"

interface Project {
  id: string
  name: string
  status: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectChange: (projectId: string | null) => void
  onProjectAdded: () => void
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onProjectChange,
  onProjectAdded,
}: ProjectSelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedProjectId || "all"}
        onValueChange={(value) => onProjectChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects (Read-only)</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name} ({project.status})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={() => setShowAddDialog(true)} size="sm" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>

      <AddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false)
          onProjectAdded()
        }}
      />
    </div>
  )
}
