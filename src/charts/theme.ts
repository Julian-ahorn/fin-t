import type { EChartsOption } from 'echarts'

export interface ChartTheme {
  textColor: string
  axisLineColor: string
  splitLineColor: string
  tooltipBg: string
}

export function getChartTheme(dark: boolean): ChartTheme {
  return dark
    ? {
        textColor: 'rgba(255,255,255,0.85)',
        axisLineColor: 'rgba(255,255,255,0.25)',
        splitLineColor: 'rgba(255,255,255,0.12)',
        tooltipBg: '#1f1f1f',
      }
    : {
        textColor: 'rgba(0,0,0,0.85)',
        axisLineColor: 'rgba(0,0,0,0.35)',
        splitLineColor: 'rgba(0,0,0,0.08)',
        tooltipBg: '#ffffff',
      }
}

export const PALETTE = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
  '#2f54eb',
  '#a0d911',
]

/** 基础坐标轴/图例/提示框通用配置 */
export function baseChartOption(dark: boolean): Partial<EChartsOption> {
  const t = getChartTheme(dark)
  return {
    textStyle: { color: t.textColor },
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLineColor,
      textStyle: { color: t.textColor },
    },
    legend: { textStyle: { color: t.textColor } },
  }
}
