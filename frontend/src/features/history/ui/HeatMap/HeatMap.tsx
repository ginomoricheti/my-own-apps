/* eslint-disable @typescript-eslint/no-explicit-any */
import './HeatMap.css'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { PomodoroRecordGet } from '@/shared/types';
import React from 'react';

interface HeatMapProps {
  data: PomodoroRecordGet[],
}
interface ProjectSummary {
  project: string;
  minutes: number;
}

interface DaySummary {
  date: string;
  minutes: number;
  projects: ProjectSummary[];
  entries: PomodoroRecordGet[];
  project: string;
  task?: any;
  x: number;
  y: number;
}

const HeatMap = ({ data }: HeatMapProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredDay, setHoveredDay] = useState<any>(null);

  // State for modal
  const [modal, setModal] = useState<{ visible: boolean; data: DaySummary | null }>({
    visible: false,
    data: null
  });

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHeatMap = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const hideHeatMap = () => {
    hoverTimeoutRef.current = setTimeout(() => setIsVisible(false), 100);
  };

  // Heatmap Config - Reduced height
  const config = {
    box: 7,
    spacing: 1,
    year: 2025,
    weekDays: ["S", "M", "T", "W", "T", "F", "S"],
    colors: [
      'rgba(255, 255, 255, 0.03)',
      '#2a2a2a',
      '#1b4332',
      '#2d5a3d',
      '#40916c',
      '#52b788',
      '#74c69d'
    ],
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };

  // Calculate dimensions dynamically - Reduced total height
  const totalWidth = 12 * 7 * (config.box + config.spacing) + 15;
  const totalHeight = 7 * (config.box + config.spacing) + 40;

  // Function to get color based on minutes
  const getColor = (minutes: number): string => {
    if (minutes === 0) return config.colors[0];
    const index = Math.min(Math.floor(minutes / 70) + 1, config.colors.length - 1);
    return config.colors[index];
  };

  // Function to format date
  const formatDate = (date: Date | string): string => {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }

    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Function to format time
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h ${hours > 1 ? 's' : ''}`;
    return `${hours} h${hours > 1 ? 's' : ''} ${mins}m`;
  };

  const toLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  // Generate data for all days of the year
  const generateYearData = useMemo(() => {
    // Map: 'YYYY-MM-DD' -> { date, minutes, projects: Map<project, minutes>, entries: [] }
    const dailySummary = new Map<string, {
      date: string;
      minutes: number;
      projects: Map<string, number>;
      entries: any[];
    }>();

    const safeParseDate = (raw: any) => {
      if (raw instanceof Date) return raw;

      if (typeof raw === 'string') {
        const trimmed = raw.trim();

        // Para fechas con tiempo como "2025-08-27 17:27:30"
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
          const [datePart, timePart] = trimmed.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);

          // Crear fecha en zona local explícitamente
          return new Date(year, month - 1, day, hour, minute, second);
        }

        // Para fechas solo con fecha como "2025-08-27"
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          const [year, month, day] = trimmed.split('-').map(Number);
          return new Date(year, month - 1, day);
        }

        // Fallback para otros formatos (mantener la lógica original)
        let candidate = trimmed;
        if (candidate.includes(' ') && !candidate.includes('T')) {
          candidate = candidate.replace(' ', 'T');
        }

        let d = new Date(candidate);
        if (isNaN(d.getTime())) {
          const onlyDate = candidate.split('T')[0] || candidate.split(' ')[0];
          const [year, month, day] = onlyDate.split('-').map(Number);
          if (year && month && day) {
            d = new Date(year, month - 1, day);
          }
        }
        return d;
      }

      return new Date(String(raw));
    };

    data.forEach(d => {
      const minutesNum = Number(d.minutes) || 0;
      const dateObj = safeParseDate(d.date);
      // Key YYYY-MM-DD
      const dateStr = toLocalDateStr(dateObj);

      if (!dailySummary.has(dateStr)) {
        dailySummary.set(dateStr, {
          date: dateStr,
          minutes: 0,
          projects: new Map(),
          entries: []
        });
      }

      const cur = dailySummary.get(dateStr)!;
      cur.minutes += minutesNum;
      cur.entries.push({
        ...d,
        minutes: minutesNum,
        date: dateObj.toISOString()
      });

      const projKey = (d.project ?? 'Sin proyecto') as string;
      cur.projects.set(projKey, (cur.projects.get(projKey) || 0) + minutesNum);
    });

    const allDates: Array<any> = [];

    for (let m = 0; m < 12; m++) {
      const start = new Date(config.year, m, 1);
      const end = new Date(config.year, m + 1, 0);

      for (let dd = new Date(start); dd <= end; dd.setDate(dd.getDate() + 1)) {
        const dateStr = toLocalDateStr(dd);
        const entry = dailySummary.get(dateStr);

        const month = dd.getMonth();
        const firstDayOfMonth = new Date(dd.getFullYear(), month, 1).getDay();
        const week = Math.floor((dd.getDate() + firstDayOfMonth - 1) / 7);
        const x = 25 + month * 7 * (config.box + config.spacing) + week * (config.box + config.spacing);
        const y = 20 + dd.getDay() * (config.box + config.spacing);

        allDates.push({
          date: dateStr,
          minutes: entry?.minutes ?? 0,
          // Convert projects Map -> array [{ project, minutes }]
          projects: entry
            ? Array.from(entry.projects.entries()).map(([project, minutes]) => ({ project, minutes }))
            : [],
          entries: entry?.entries ?? [],
          project: entry?.projects && entry.projects.size === 1 ? Array.from(entry.projects.keys())[0] : '-',
          task: undefined,
          x,
          y
        });
      }
    }

    return allDates;
  }, [JSON.stringify(data), config.year, config.box, config.spacing]);

  // Draw square with effects
  const drawSquare = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isHovered: boolean = false) => {
    const radius = 1;

    // Shadow for hover
    if (isHovered) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Square with rounded corners
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, config.box, config.box, radius);
    ctx.fill();

    // Subtle border
    if (isHovered) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Draw text with better rendering
  const drawText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: any = {}) => {
    const {
      fontSize = 10,
      color = '#8b949e',
      align = 'left',
      baseline = 'top',
      bold = false
    } = options;

    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  };

  // Draw heatmap on canvas
  const drawHeatMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure canvas for high resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas with soft background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw weekday labels
    config.weekDays.forEach((day, i) => {
      drawText(ctx, day.substr(0, 3), 15, 20 + i * (config.box + config.spacing) + config.box / 2, {
        fontSize: 7,
        color: '#888888',
        align: 'right',
        baseline: 'middle'
      });
    });

    // Draw month labels
    config.monthNames.forEach((month, i) => {
      drawText(ctx, month, 25 + i * 7 * (config.box + config.spacing) + 22, 8, {
        fontSize: 10,
        color: '#ffffff',
        align: 'center',
        bold: true
      });
    });

    // Draw heatmap squares
    const yearData = generateYearData;

    yearData.forEach(day => {
      const isHovered = hoveredDay && hoveredDay.date === day.date;
      drawSquare(ctx, day.x, day.y, getColor(day.minutes), isHovered);
    });

    // Draw improved legend
    const legendData = [0, 70, 140, 210, 280, 420];
    const legendY = totalHeight - 14;
    const legendStartX = (totalWidth / 2) - 30;

    drawText(ctx, "Less", legendStartX - 25, legendY + config.box / 2, {
      fontSize: 8,
      color: '#888888',
      align: 'right',
      baseline: 'middle'
    });

    // Legend squares
    legendData.forEach((value, i) => {
      drawSquare(ctx, legendStartX + i * (config.box + config.spacing), legendY, getColor(value));
    });

    drawText(ctx, "More", legendStartX + legendData.length * (config.box + config.spacing) + 5, legendY + config.box / 2, {
      fontSize: 8,
      color: '#888888',
      align: 'left',
      baseline: 'middle'
    });

  }, [generateYearData, hoveredDay, totalWidth, totalHeight]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const yearData = generateYearData;

    // Debug: mostrar todos los días con datos y sus coordenadas
    const daysWithData = yearData.filter(day => day.minutes > 0);
    console.log('Days with data and their positions:');
    daysWithData.forEach(day => {
      console.log(`${day.date}: x=${day.x}-${day.x + config.box}, y=${day.y}-${day.y + config.box}, minutes=${day.minutes}`);
    });

    const clickedDay = yearData.find(day =>
      clickX >= day.x && clickX <= day.x + config.box &&
      clickY >= day.y && clickY <= day.y + config.box
    );

    if (clickedDay) {
      setModal({
        visible: true,
        data: clickedDay
      });
    }
  }, [generateYearData]);

  // Enhanced hover handling
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const yearData = generateYearData;
    const newHoveredDay = yearData.find(day =>
      x >= day.x && x <= day.x + config.box &&
      y >= day.y && y <= day.y + config.box
    );

    if (newHoveredDay !== hoveredDay) {
      setHoveredDay(newHoveredDay);

      if (newHoveredDay) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }, [generateYearData, hoveredDay]);

  const handleMouseLeave = useCallback(() => {
    setHoveredDay(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    hideHeatMap();
  }, []);

  // Close modal
  const closeModal = () => {
    setModal({ visible: false, data: null });
  };

  // Redraw when hover changes
  useEffect(() => {
    if (isVisible) {
      drawHeatMap();
    }
  }, [isVisible, drawHeatMap, hoveredDay, data]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        className='hoverHistoryZone'
        onMouseEnter={showHeatMap}
        onMouseLeave={hideHeatMap}
      />

      <div
        id="orderHeatMapBox"
        className={isVisible ? 'visible' : ''}
        onMouseEnter={showHeatMap}
        onMouseLeave={handleMouseLeave}
        style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '10px 10px 0 5px',
          border: '1px solid #333333',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            display: 'block',
            borderRadius: '8px'
          }}
        />
      </div>

      {/* Informational modal */}
      {modal.visible && modal.data && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#2a2a2a',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #444444',
              boxShadow: '0 20px 80px rgba(0, 0, 0, 0.9)',
              color: '#ffffff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
              minWidth: '400px',
              maxWidth: '500px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                Daily Activity
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#444444';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#888888';
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ lineHeight: '1.6' }}>
              <div style={{
                background: '#1a1a1a',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #333333'
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  color: '#53ae5e',
                  fontSize: '16px'
                }}>
                  {formatDate(modal.data.date)}
                </h3>
                <div style={{
                  color: '#888888',
                  fontSize: '14px'
                }}>
                  {formatDate(modal.data.date)}
                </div>
              </div>

              {modal.data.minutes > 0 ? (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#53ae5e' }}>
                      {formatTime(modal.data.minutes)}
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#ffffff' }}>Projects:</strong>
                    <div style={{ marginTop: '8px' }}>
                      {modal.data.projects && modal.data.projects.length > 0 ? (
                        modal.data.projects.map((p: any) => (
                          <div key={p.project} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#ffffff' }}>{p.project}</span>
                            <span style={{ color: '#888888' }}>{formatTime(p.minutes)}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#888888' }}>No project data</div>
                      )}
                    </div>
                  </div>

                  {/* Opcional: detalle de entradas por día */}
                  {modal.data.entries && modal.data.entries.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <strong style={{ color: '#ffffff' }}>Logs</strong>
                      <div style={{
                        marginTop: '8px',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none', /* IE/Edge */
                      }}>
                        {modal.data.entries.map((e: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a2a' }}>
                            <div>
                              <div style={{ color: '#ffffff', fontSize: '13px' }}>{e.task?.name ?? '—'}
                                <span style={{ marginLeft: '10px', color: '#888888', fontSize: '12px' }}>{new Date(e.date).toLocaleTimeString()}</span>
                              </div>
                            </div>
                            <div style={{ color: '#888888', alignSelf: 'center' }}>{formatTime(e.minutes)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '20px' }}>
                    <strong style={{ color: '#ffffff' }}>Resume</strong>
                    <div style={{ color: '#888888', marginTop: '6px' }}>
                      Main project:{' '}
                      <span style={{ color: '#ffffff' }}>
                        {modal.data.projects && modal.data.projects.length > 0
                          ? modal.data.projects.reduce((a: any, b: any) => (b.minutes > a.minutes ? b : a)).project
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888888' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>😴</div>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No activity recorded</div>
                  <div style={{ fontSize: '14px', color: '#666666' }}>No productivity data for this day</div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #333333',
              fontSize: '12px',
              color: '#666666',
              textAlign: 'center'
            }}>
              Click outside this window to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(HeatMap);