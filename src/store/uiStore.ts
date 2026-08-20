import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  theme: 'light' | 'dark'
  activeLedgerId: string | null
  /** 记账弹窗 */
  entryOpen: boolean
  /** 编辑中的流水 id（null 表示新增） */
  editingTxId: string | null
  setTheme: (theme: 'light' | 'dark') => void
  setActiveLedgerId: (id: string | null) => void
  openEntry: () => void
  closeEntry: () => void
  openEdit: (txId: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      activeLedgerId: null,
      entryOpen: false,
      editingTxId: null,
      setTheme: (theme) => set({ theme }),
      setActiveLedgerId: (id) => set({ activeLedgerId: id }),
      openEntry: () => set({ entryOpen: true, editingTxId: null }),
      closeEntry: () => set({ entryOpen: false, editingTxId: null }),
      openEdit: (txId) => set({ entryOpen: true, editingTxId: txId }),
    }),
    {
      name: 'fin-t-ui',
      partialize: (s) => ({ theme: s.theme, activeLedgerId: s.activeLedgerId }),
    },
  ),
)
