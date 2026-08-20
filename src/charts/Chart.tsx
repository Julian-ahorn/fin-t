import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { EChartsOption } from 'echarts'
import echarts from './echarts'

interface ChartProps {
  option: EChartsOption
  height?: number
  style?: CSSProperties
  /** option 变化时是否清空重绘（默认 true） */
  notMerge?: boolean
}

/** 通用 ECharts React 封装：初始化、更新、自适应、销毁 */
export default function Chart({ option, height = 320, style, notMerge = true }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, notMerge)
  }, [option, notMerge])

  return <div ref={containerRef} style={{ height, width: '100%', ...style }} />
}
