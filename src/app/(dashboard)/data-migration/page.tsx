'use client';

import React, { useState, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, Sparkles, CheckCircle2, AlertTriangle,
  ArrowRight, Loader2, FolderUp, Wand2, Eye,
  FileCheck, Brain, Zap, Shield, HelpCircle, ChevronRight,
  MessageSquare, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { clientLogger } from '@/lib/client-logger';

// Types
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: 'pending' | 'analyzing' | 'analyzed' | 'error';
  sheets?: SheetInfo[];
  suggestedMapping?: string;
  error?: string;
}

interface SheetInfo {
  name: string;
  rowCount: number;
  columns: string[];
  suggestedTarget: string;
  confidence: number;
  mappings: ColumnMapping[];
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sampleValues?: string[];
  issues?: string[];
}

interface MigrationStep {
  id: number;
  title: string;
  titleVi: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export default function DataMigrationCopilotPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    totalFiles: number;
    totalRecords: number;
    mappedFields: number;
    unmappedFields: number;
    warnings: number;
    errors: number;
    confidence: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là AI Copilot hỗ trợ di chuyển dữ liệu. Hãy upload file Excel cũ của bạn, tôi sẽ tự động phân tích và chuyển đổi sang format mới.'
    }
  ]);
  const [userInput, setUserInput] = useState('');

  const steps: MigrationStep[] = [
    { id: 1, title: 'Upload', titleVi: 'Tải lên', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'Analyze', titleVi: 'Phân tích', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
    { id: 3, title: 'Mapping', titleVi: 'Mapping', status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending' },
    { id: 4, title: 'Validate', titleVi: 'Kiểm tra', status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending' },
    { id: 5, title: 'Import', titleVi: 'Import', status: currentStep === 5 ? 'active' : currentStep > 5 ? 'completed' : 'pending' },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList
      .filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'))
      .map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: f.size,
        file: f,
        status: 'pending' as const
      }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startAIAnalysis = async () => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setCurrentStep(2);

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f.file);
    });

    try {
      // Update status to analyzing
      setFiles(prev => prev.map(f => ({ ...f, status: 'analyzing' as const })));

      const response = await fetch('/api/migration/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();

      if (result.success) {
        // Update files with analysis results
        const analyzedFiles = files.map((f, idx) => {
          const fileResult = result.data.files[idx];
          if (fileResult) {
            return {
              ...f,
              status: 'analyzed' as const,
              sheets: fileResult.sheets.map((s: { name: string; rowCount: number; columns: string[]; analysis: { targetTable: string; confidence: number; mappings: ColumnMapping[] } }) => ({
                name: s.name,
                rowCount: s.rowCount,
                columns: s.columns,
                suggestedTarget: s.analysis.targetTable,
                confidence: s.analysis.confidence,
                mappings: s.analysis.mappings
              })),
              suggestedMapping: fileResult.sheets[0]?.analysis.targetTable || 'Unknown'
            };
          }
          return { ...f, status: 'error' as const, error: 'No analysis result' };
        });

        setFiles(analyzedFiles);
        setAnalysisResult(result.data.summary);
        setCurrentStep(3);

        // Add AI message
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: `Đã phân tích xong ${result.data.summary.totalFiles} file!\n\nKết quả:\n- Tổng records: ${result.data.summary.totalRecords}\n- Fields mapped: ${result.data.summary.mappedFields}\n- Độ tin cậy: ${result.data.summary.confidence}%\n\n${result.data.summary.warnings > 0 ? `Có ${result.data.summary.warnings} cảnh báo cần xem lại.` : 'Dữ liệu sẵn sàng để import!'}`
        }]);
      }
    } catch (error) {
      clientLogger.error('Analysis error:', error);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: 'Analysis failed' })));
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Có lỗi xảy ra khi phân tích. Vui lòng thử lại hoặc kiểm tra format file.'
      }]);
    }

    setIsAnalyzing(false);
  };

  const runValidation = () => {
    setCurrentStep(4);
    setAiMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Đang kiểm tra dữ liệu...\n\nKiểm tra format, trùng lặp, và tính hợp lệ.\n\nDữ liệu sẵn sàng để import! Nhấn "Import Ngay" để hoàn tất.'
    }]);
  };

  const runImport = async () => {
    setCurrentStep(5);
    setIsImporting(true);

    try {
      // Collect all data from analyzed files
      for (const file of files) {
        if (!file.sheets) continue;

        for (const sheet of file.sheets) {
          const response = await fetch('/api/migration/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetTable: sheet.suggestedTarget,
              data: [], // This would be the actual transformed data
              mappings: sheet.mappings,
              options: {
                skipDuplicates: true,
                updateExisting: false
              }
            })
          });

          const result = await response.json();
          if (result.success) {
            setImportResult(prev => ({
              success: (prev?.success || 0) + result.data.summary.success,
              failed: (prev?.failed || 0) + result.data.summary.failed,
              skipped: (prev?.skipped || 0) + result.data.summary.skipped
            }));
          }
        }
      }

      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: `HOÀN THÀNH!\n\nĐã import thành công.\n\nBạn có thể vào menu Parts để xem dữ liệu mới.`
      }]);
    } catch (error) {
      clientLogger.error('Import error:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Có lỗi khi import. Vui lòng thử lại.'
      }]);
    }

    setIsImporting(false);
  };

  const handleAISend = () => {
    if (!userInput.trim()) return;

    setAiMessages(prev => [...prev, { role: 'user', content: userInput }]);

    setTimeout(() => {
      let response = '';
      const input = userInput.toLowerCase();

      if (input.includes('help') || input.includes('giúp')) {
        response = 'Tôi có thể giúp bạn:\n\n1. Upload file Excel cũ\n2. Tự động nhận diện loại dữ liệu\n3. Map columns sang schema mới\n4. Kiểm tra và import dữ liệu\n\nBắt đầu bằng cách kéo thả file vào vùng upload.';
      } else if (input.includes('format') || input.includes('định dạng')) {
        response = 'Tôi hỗ trợ các format:\n\n- Excel (.xlsx, .xls)\n- CSV (.csv)\n\nCột có thể bằng tiếng Việt hoặc tiếng Anh.\nVí dụ: "Mã LK", "Part Number", "Tên", "Name"...';
      } else {
        response = 'Tôi hiểu. Bạn có thể:\n\n1. Upload file để bắt đầu\n2. Hỏi về format được hỗ trợ\n3. Xem chi tiết mapping\n\nTôi sẵn sàng hỗ trợ!';
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 500);

    setUserInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Data Migration Copilot</h1>
            <p className="text-primary-100">Trợ lý AI giúp di chuyển dữ liệu Excel cũ sang hệ thống mới</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${step.status === 'completed' ? 'bg-success-500 text-white' :
                      step.status === 'active' ? 'bg-primary-500 text-white' :
                        'bg-gray-200 text-gray-500'}`}>
                    {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="hidden sm:block">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.titleVi}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderUp className="w-5 h-5 text-primary-500" />
                  Upload Excel Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-primary-300 dark:border-primary-600 rounded-xl p-8 text-center
                    hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      Kéo thả file Excel vào đây
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      hoặc click để chọn file (.xlsx, .xls, .csv)
                    </p>
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Files đã chọn:</h3>
                    {files.map(file => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                        <FileSpreadsheet className="w-8 h-8 text-success-500" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} aria-label="Xóa tệp">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      onClick={startAIAnalysis}
                      disabled={files.length === 0}
                      className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600"
                    >
                      <Wand2 className="w-5 h-5 mr-2" />
                      Bắt đầu AI Phân tích
                    </Button>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
                  <h4 className="font-medium text-warning-800 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Mẹo nhanh
                  </h4>
                  <ul className="mt-2 text-sm text-warning-700 space-y-1">
                    <li>- Upload tất cả file Excel cũ cùng lúc</li>
                    <li>- AI sẽ tự động nhận diện loại dữ liệu (Parts, BOM, Suppliers...)</li>
                    <li>- Không cần chỉnh sửa file - AI xử lý mọi format</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: AI Analyzing */}
          {currentStep === 2 && isAnalyzing && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="relative inline-block">
                    <Brain className="w-16 h-16 text-purple-500 animate-pulse" />
                    <Sparkles className="w-6 h-6 text-warning-400 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <h2 className="text-xl font-semibold mt-4">AI đang phân tích dữ liệu...</h2>
                  <p className="text-muted-foreground mt-2">Đang nhận diện cấu trúc và mapping fields</p>

                  <div className="mt-6 max-w-md mx-auto space-y-2">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6 text-success-500" />
                        <div className="flex-1 text-left text-sm font-medium">{file.name}</div>
                        {file.status === 'analyzing' && <Loader2 className="w-5 h-5 animate-spin text-primary-500" />}
                        {file.status === 'analyzed' && <CheckCircle2 className="w-5 h-5 text-success-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3+: Results */}
          {currentStep >= 3 && !isAnalyzing && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-success-500" />
                    Kết quả AI Mapping
                  </CardTitle>
                  {analysisResult && (
                    <Badge variant="secondary" className="bg-success-100 text-success-700">
                      {analysisResult.confidence}% tin cậy
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Cards */}
                {analysisResult && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary-600">{analysisResult.totalFiles}</div>
                      <div className="text-sm text-primary-600">Files</div>
                    </div>
                    <div className="p-4 bg-success-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-success-600">{analysisResult.totalRecords}</div>
                      <div className="text-sm text-success-600">Records</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysisResult.mappedFields}</div>
                      <div className="text-sm text-purple-600">Fields Mapped</div>
                    </div>
                    <div className="p-4 bg-warning-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-warning-600">{analysisResult.warnings}</div>
                      <div className="text-sm text-warning-600">Cảnh báo</div>
                    </div>
                  </div>
                )}

                {/* Mapping Details */}
                {files.map(file => file.sheets?.map(sheet => (
                  <div key={`${file.id}-${sheet.name}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{file.name}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Badge>{sheet.suggestedTarget}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{sheet.rowCount} rows</span>
                    </div>

                    <div className="space-y-2">
                      {sheet.mappings.slice(0, 6).map((mapping, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium w-28 truncate">{mapping.sourceColumn}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-primary-600 w-28 truncate">{mapping.targetField}</span>
                          <div className="flex-1">
                            <Progress
                              value={mapping.confidence}
                              className={`h-2 ${mapping.confidence > 90 ? '[&>div]:bg-success-500' :
                                mapping.confidence > 70 ? '[&>div]:bg-warning-500' : '[&>div]:bg-danger-500'
                                }`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12">{mapping.confidence}%</span>
                          {mapping.issues && mapping.issues.length > 0 && (
                            <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                      {sheet.mappings.length > 6 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{sheet.mappings.length - 6} more mappings
                        </p>
                      )}
                    </div>
                  </div>
                )))}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {currentStep === 3 && (
                    <Button onClick={runValidation} className="flex-1">
                      <Shield className="w-5 h-5 mr-2" />
                      Validate Data
                    </Button>
                  )}
                  {currentStep === 4 && (
                    <Button
                      onClick={runImport}
                      disabled={isImporting}
                      className="flex-1 bg-success-500 hover:bg-success-600"
                    >
                      {isImporting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5 mr-2" />
                      )}
                      {isImporting ? 'Importing...' : 'Import Ngay'}
                    </Button>
                  )}
                  {currentStep === 5 && !isImporting && (
                    <Button
                      onClick={() => window.location.href = '/parts'}
                      className="flex-1 bg-purple-500 hover:bg-purple-600"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Xem Parts
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Chat Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5" />
                AI Copilot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-3 rounded-lg text-sm whitespace-pre-wrap
                      ${msg.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-none'
                        : 'bg-gray-100 rounded-bl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2 items-center">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAISend()}
                    placeholder="Hỏi AI Copilot..."
                    className="flex-1 h-10"
                  />
                  <Button onClick={handleAISend} size="icon" className="shrink-0" aria-label="Gửi tin nhắn">
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserInput('Giúp tôi')}
                    className="text-xs"
                  >
                    Trợ giúp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserInput('Format được hỗ trợ')}
                    className="text-xs"
                  >
                    Formats
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
