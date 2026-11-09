import React, { useState } from 'react';
import { ClientRole } from '../types/game';
import { Monitor, Users, Flame, Zap, Split, ArrowRight, Sparkles } from 'lucide-react';

interface RoleSelectProps {
  onSelectRole: (role: ClientRole | 'split') => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  onSelectRole,
  roomCode,
  setRoomCode,
}) => {
  const [customRoom, setCustomRoom] = useState(roomCode);

  const handleSelect = (role: ClientRole | 'split') => {
    if (customRoom.trim()) {
      setRoomCode(customRoom.trim().toUpperCase());
    }
    onSelectRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Background ambient stadium glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-8 text-center">
        {/* Grand Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-950/40">
            <Sparkles className="w-4 h-4" /> Game Kéo Co Đố Vui Đối Kháng Online
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Đại Chiến Kéo Co Trực Tuyến
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Kết nối nhiều máy tính qua Internet. 1 máy chủ chiếu rạp nhìn thấy 2 đội và dây thừng kéo co, các máy của 2 đội chỉ nhìn thấy màn hình thi đấu của mình.
          </p>
        </div>

        {/* Room Code Selection */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <span className="text-xs font-bold text-slate-400 pl-3">Mã phòng:</span>
          <input
            type="text"
            maxLength={10}
            value={customRoom}
            onChange={(e) => setCustomRoom(e.target.value.toUpperCase())}
            placeholder="ARENA"
            className="w-28 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono font-black text-sm text-center outline-none focus:border-amber-500"
          />
        </div>

        {/* Main 3 Roles Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {/* OPTION 1: HOST (MÁY CHỦ) */}
          <button
            onClick={() => handleSelect('host')}
            className="group relative p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/80 hover:bg-slate-800/80 transition-all duration-200 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-md">
                <Monitor className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  MÀN HÌNH CHIẾU RẠP
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  🖥️ Máy Chủ (Host)
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Nhìn thấy toàn cảnh 2 đội, dây thừng kéo co di chuyển thời gian thực, quản lý và thêm/xóa ngân hàng câu hỏi, điều khiển trận đấu.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Vào làm Máy Chủ</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* OPTION 2: TEAM 1 (ĐỘI ĐỎ) */}
          <button
            onClick={() => handleSelect('team1')}
            className="group relative p-6 rounded-3xl bg-slate-900/90 border border-red-900/40 hover:border-red-500 hover:bg-red-950/30 transition-all duration-200 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all shadow-md">
                <Flame className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                  THIẾT BỊ THI ĐẤU
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  🔴 Đội 1 (Đội Đỏ)
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Chỉ hiển thị màn hình riêng của Đội 1, 4 nút chọn đáp án A, B, C, D to rõ, điểm số và tình hình kéo dây của đội mình.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-red-950 flex items-center justify-between text-xs font-bold text-red-400 group-hover:text-red-300">
              <span>Tham gia Đội 1</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* OPTION 3: TEAM 2 (ĐỘI XANH) */}
          <button
            onClick={() => handleSelect('team2')}
            className="group relative p-6 rounded-3xl bg-slate-900/90 border border-blue-900/40 hover:border-blue-500 hover:bg-blue-950/30 transition-all duration-200 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md">
                <Zap className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                  THIẾT BỊ THI ĐẤU
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  🔵 Đội 2 (Đội Xanh)
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Chỉ hiển thị màn hình riêng của Đội 2, giao diện xanh dương thi đấu, nút bấm trắc nghiệm, điểm số và combo tốc độ.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-950 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
              <span>Tham gia Đội 2</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* 1-SCREEN TEST SIMULATION BUTTON */}
        <div className="pt-2">
          <button
            onClick={() => handleSelect('split')}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-bold border border-slate-700/80 transition-all shadow-lg hover:border-slate-500 cursor-pointer"
          >
            <Split className="w-4 h-4 text-amber-400" />
            <span>Chế độ kiểm thử 3-trong-1 (Xem cùng lúc Máy Chủ + Đội 1 + Đội 2 trên 1 màn hình)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
