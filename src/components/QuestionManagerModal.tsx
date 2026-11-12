import React, { useState } from 'react';
import { Question } from '../types/game';
import { PRESET_PACKS } from '../data/defaultQuestions';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Save,
  HelpCircle,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onAddQuestion: (q: Omit<Question, 'id'>) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onLoadPreset: (key: string) => void;
}

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onLoadPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'presets' | 'ai'>('list');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form state
  const [formText, setFormText] = useState('');
  const [formOptions, setFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formCategory, setFormCategory] = useState('Tổng hợp');
  const [formTimeLimit, setFormTimeLimit] = useState<number>(20);

  // AI state
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState<number>(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Preset filter state
  const [presetTabFilter, setPresetTabFilter] = useState<'all' | 'medium30' | 'fast10'>('medium30');

  if (!isOpen) return null;

  const resetForm = () => {
    setFormText('');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormExplanation('');
    setFormCategory('Tổng hợp');
    setFormTimeLimit(20);
    setEditingQuestion(null);
  };

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormText(q.text);
    setFormOptions([...q.options] as [string, string, string, string]);
    setFormCorrectIndex(q.correctIndex);
    setFormExplanation(q.explanation || '');
    setFormCategory(q.category || 'Tổng hợp');
    setFormTimeLimit(q.timeLimit || 20);
    setActiveTab('add');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;
    if (formOptions.some((opt) => !opt.trim())) {
      alert('Vui lòng điền đầy đủ cả 4 phương án lựa chọn A, B, C, D');
      return;
    }

    if (editingQuestion) {
      onEditQuestion({
        ...editingQuestion,
        text: formText.trim(),
        options: formOptions.map((o) => o.trim()) as [string, string, string, string],
        correctIndex: formCorrectIndex,
        explanation: formExplanation.trim(),
        category: formCategory.trim(),
        timeLimit: formTimeLimit,
      });
    } else {
      onAddQuestion({
        text: formText.trim(),
        options: formOptions.map((o) => o.trim()) as [string, string, string, string],
        correctIndex: formCorrectIndex,
        explanation: formExplanation.trim(),
        category: formCategory.trim(),
        timeLimit: formTimeLimit,
      });
    }

    resetForm();
    setActiveTab('list');
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      setAiError('Vui lòng nhập chủ đề bạn muốn AI tạo câu hỏi');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim(), count: aiCount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gọi AI');
      }

      if (data.questions && Array.isArray(data.questions)) {
        for (const q of data.questions) {
          onAddQuestion(q);
        }
        setAiTopic('');
        setActiveTab('list');
      }
    } catch (err: any) {
      setAiError(err.message || 'Không thể tạo câu hỏi lúc này');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `keo-co-cau-hoi-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          let count = 0;
          for (const item of imported) {
            if (item.text && Array.isArray(item.options) && item.options.length === 4) {
              onAddQuestion({
                text: item.text,
                options: item.options as [string, string, string, string],
                correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
                explanation: item.explanation || '',
                category: item.category || 'Nhập từ file',
                timeLimit: item.timeLimit || 20,
              });
              count++;
            }
          }
          alert(`Đã nhập thành công ${count} câu hỏi từ file!`);
          setActiveTab('list');
        }
      } catch (err) {
        alert('File JSON không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Quản Lý Ngân Hàng Câu Hỏi
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {questions.length} câu
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Thêm, sửa, xóa hoặc nạp các bộ câu hỏi mẫu cho trận kéo co
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs sm:text-sm font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Danh sách câu hỏi ({questions.length})
          </button>

          <button
            onClick={() => {
              if (activeTab !== 'add') resetForm();
              setActiveTab('add');
            }}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'add'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Bộ câu hỏi có sẵn
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60 font-bold'
                : 'border-transparent text-indigo-400/80 hover:text-indigo-300 hover:bg-slate-800/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            🤖 Tạo bằng AI (Gemini)
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: QUESTION LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-400 font-medium">
                  Hiển thị thứ tự các câu hỏi sẽ xuất hiện trong các hiệp đấu
                </span>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer border border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    Nhập JSON
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                  </label>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Xuất JSON
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                  <HelpCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Ngân hàng câu hỏi đang trống!</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hãy bấm &quot;Thêm câu hỏi mới&quot; hoặc chọn một trong các &quot;Bộ câu hỏi có sẵn&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs">
                            Câu {idx + 1}
                          </span>
                          {q.category && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[11px]">
                              {q.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" /> {q.timeLimit || 20}s
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white mb-2">{q.text}</h3>

                        {/* Options preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correctIndex;
                            const label = ['A', 'B', 'C', 'D'][optIdx];
                            return (
                              <div
                                key={optIdx}
                                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-semibold'
                                    : 'bg-slate-900/60 text-slate-400'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {label}
                                </span>
                                <span className="truncate">{opt}</span>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleStartEdit(q)}
                          className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                          title="Chỉnh sửa câu hỏi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa câu "${q.text.slice(0, 30)}..."?`)) {
                              onDeleteQuestion(q.id);
                            }
                          }}
                          className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD / EDIT QUESTION FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveForm} className="space-y-5 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-base text-white">
                  {editingQuestion ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới Vào Ngân Hàng'}
                </h3>
                {editingQuestion && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nội dung câu hỏi <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Ví dụ: Đỉnh núi Fansipan thuộc tỉnh nào của Việt Nam?"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-white text-sm"
                />
              </div>

              {/* 4 Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  4 Phương án trả lời (chọn nút tròn để đánh dấu đáp án đúng) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2.5">
                  {formOptions.map((opt, idx) => {
                    const label = ['A', 'B', 'C', 'D'][idx];
                    const isCorrect = formCorrectIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${
                          isCorrect ? 'bg-emerald-950/40 border-emerald-500/70' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setFormCorrectIndex(idx)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                            isCorrect
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {label}
                        </button>

                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formOptions] as [string, string, string, string];
                            updated[idx] = e.target.value;
                            setFormOptions(updated);
                          }}
                          placeholder={`Nội dung phương án ${label}`}
                          className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                        />

                        {isCorrect && (
                          <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-600/50 shrink-0">
                            Đáp án đúng ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metadata: Category & Time Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Chủ đề / Thể loại
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ví dụ: Lịch sử, Đố vui, Khoa học..."
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 outline-none text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Thời gian trả lời (giây)
                  </label>
                  <select
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 outline-none text-white text-sm"
                  >
                    <option value={10}>10 giây (Rất nhanh)</option>
                    <option value={15}>15 giây (Nhanh)</option>
                    <option value={20}>20 giây (Chuẩn)</option>
                    <option value={30}>30 giây (Thoải mái)</option>
                    <option value={45}>45 giây (Khó)</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Giải thích đáp án (tùy chọn)
                </label>
                <input
                  type="text"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Thông tin giải thích thêm khi vòng đấu kết thúc"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 outline-none text-white text-sm"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingQuestion ? 'Lưu Thay Đổi' : 'Thêm Vào Ngân Hàng'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Chọn một trong 15 bộ câu hỏi được biên soạn sẵn để bắt đầu thi đấu ngay lập tức:
                </p>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs shrink-0">
                  <button
                    onClick={() => setPresetTabFilter('medium30')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      presetTabFilter === 'medium30'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10 Chủ đề Tiêu chuẩn (30 câu) ⭐
                  </button>
                  <button
                    onClick={() => setPresetTabFilter('fast10')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      presetTabFilter === 'fast10'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    5 Bộ Đấu Nhanh (10 câu)
                  </button>
                  <button
                    onClick={() => setPresetTabFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      presetTabFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả (15)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {Object.entries(PRESET_PACKS)
                  .filter(([_, pack]) => {
                    if (presetTabFilter === 'medium30') return pack.questions.length === 30;
                    if (presetTabFilter === 'fast10') return pack.questions.length === 10;
                    return true;
                  })
                  .map(([key, pack]) => (
                  <div
                    key={key}
                    className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            {pack.icon || '🎯'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                            pack.questions.length === 30
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {pack.questions.length} câu hỏi
                          </span>
                          {pack.difficulty && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                              Cấp độ {pack.difficulty}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                          {pack.category || 'Trắc nghiệm'}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                        {pack.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {pack.description}
                      </p>

                      {/* Sample preview list of questions */}
                      <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Xem trước câu hỏi mẫu:
                        </span>
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          {pack.questions.slice(0, 3).map((q, qIdx) => (
                            <div key={q.id || qIdx} className="truncate text-slate-400">
                              <span className="text-amber-400/80 font-bold mr-1">#{qIdx + 1}</span>
                              {q.text}
                            </div>
                          ))}
                          {pack.questions.length > 3 && (
                            <div className="text-[10px] text-slate-500 italic">
                              ... và {pack.questions.length - 3} câu hỏi đặc sắc khác
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn muốn nạp "${pack.name}"? (Sẽ thay thế danh sách câu hỏi hiện tại của trận đấu)`)) {
                          onLoadPreset(key);
                          setActiveTab('list');
                        }
                      }}
                      className="mt-4 w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs sm:text-sm border border-amber-500/40 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Nạp bộ câu hỏi này ({pack.questions.length} câu)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AI GENERATOR */}
          {activeTab === 'ai' && (
            <div className="max-w-xl mx-auto space-y-5 py-2">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Trợ Lý AI Soạn Câu Hỏi Tự Động (Gemini 2.5 Flash)
                </div>
                Nhập bất kỳ chủ đề nào (ví dụ: &quot;Lịch sử hào hùng Việt Nam&quot;, &quot;Toán đố hài hước lớp 5&quot;, &quot;Văn hóa ẩm thực 3 miền&quot;), AI sẽ tự động sinh ra các câu trắc nghiệm hấp dẫn kèm đáp án chính xác!
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Chủ đề mong muốn <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ví dụ: Thể thao thế giới, Ca dao tục ngữ, Khoa học vũ trụ..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Số lượng câu hỏi cần tạo
                </label>
                <div className="flex gap-3">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAiCount(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        aiCount === num
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num} câu
                    </button>
                  ))}
                </div>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-medium">
                  {aiError}
                </div>
              )}

              <button
                type="button"
                disabled={aiLoading}
                onClick={handleAiGenerate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI Đang Suy Nghĩ & Biên Soạn Câu Hỏi...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Tạo {aiCount} Câu Hỏi Với AI Ngay
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
