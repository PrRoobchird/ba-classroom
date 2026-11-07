import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'เกิดข้อผิดพลาดในการโหลด' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('ba_current_user');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleClearAllAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center bg-[#f7f4ee] p-4 text-[#2d2825] font-sans">
          <div className="bg-[#fdfbf7] rounded-3xl shadow-xl w-full max-w-md p-8 border border-[#e7e1d8] text-center">
            <div className="w-16 h-16 bg-[#ba6a38]/10 text-[#ba6a38] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-[#2d2825] mb-2">ไม่สามารถโหลดหน้าเว็บได้</h2>
            <p className="text-xs text-[#7a7267] mb-6 leading-relaxed">
              อาจเกิดจากข้อมูลแคชเก่าในอุปกรณ์ หรือการเชื่อมต่อ กรุณากดปุ่มด้านล่างเพื่อเริ่มใหม่อย่างราบรื่น
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 bg-[#c06a35] hover:bg-[#aa5b2b] text-white rounded-xl text-sm font-medium transition cursor-pointer"
              >
                โหลดหน้านี้ใหม่อีกครั้ง
              </button>
              <button
                type="button"
                onClick={this.handleClearAllAndReload}
                className="w-full py-2 bg-transparent hover:bg-[#ede7dd] text-[#7a7267] rounded-xl text-xs transition cursor-pointer"
              >
                ล้างข้อมูลแคชเก่าและเข้าสู่ระบบใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
