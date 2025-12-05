import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar } from 'lucide-react';

const Header: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('載入日期中...');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('zh-Hant', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      });
      setCurrentDateTime(formatter.format(now));
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="mb-8 border-b-4 border-sky-600 pb-4">
      <div className="text-base font-medium text-slate-600 mb-2 flex items-center justify-end">
        <Calendar className="w-4 h-4 mr-1" />
        {currentDateTime}
      </div>

      <div className="flex items-center text-sky-700">
        <BarChart3 className="w-10 h-10 mr-4" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            【金融市場研究報告】
          </h1>
          <p className="text-lg text-sky-600 mt-1">美國科技巨頭與宏觀指數深度追蹤</p>
        </div>
      </div>
    </header>
  );
};

export default Header;