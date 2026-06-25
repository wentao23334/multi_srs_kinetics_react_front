import { useState } from 'react';
import { workflowApi } from '../lib/workflowApi';

export function useExtractionSource() {
  const [folderInput, setFolderInput] = useState('');
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [foundSrsFiles, setFoundSrsFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [applyFolderPending, setApplyFolderPending] = useState(false);

  const applyFolder = async () => {
    const folderPath = folderInput.trim();
    if (!folderPath) {
      throw new Error('Please enter a valid folder path.');
    }

    setApplyFolderPending(true);
    try {
      const body = await workflowApi.listFolder({ folder_path: folderPath });
      setCurrentFolderPath(body.folder_path);
      setFoundSrsFiles(body.files);
      setSelectedFiles([]);
      return body;
    } finally {
      setApplyFolderPending(false);
    }
  };

  const selectAllFiles = (checked: boolean) => {
    setSelectedFiles(checked ? [...foundSrsFiles] : []);
  };

  const toggleSelectedFile = (file: string, checked: boolean) => {
    setSelectedFiles((prev) =>
      checked
        ? prev.includes(file)
          ? prev
          : [...prev, file]
        : prev.filter((item) => item !== file),
    );
  };

  return {
    folderInput,
    setFolderInput,
    currentFolderPath,
    foundSrsFiles,
    selectedFiles,
    applyFolderPending,
    applyFolder,
    selectAllFiles,
    toggleSelectedFile,
  };
}
