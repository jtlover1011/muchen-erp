import { createContext, useContext, type ReactNode } from 'react'
import type { PageId } from './nav'

type GoValue = {
  go: (id: PageId) => void
  openProductCreate: () => void
  createAsk: number
}

const GoContext = createContext<GoValue>({
  go: () => {},
  openProductCreate: () => {},
  createAsk: 0,
})

export function GoProvider({
  go,
  openProductCreate,
  createAsk,
  children,
}: GoValue & { children: ReactNode }) {
  return <GoContext.Provider value={{ go, openProductCreate, createAsk }}>{children}</GoContext.Provider>
}

export function useGo() {
  return useContext(GoContext).go
}

export function useOpenProductCreate() {
  return useContext(GoContext).openProductCreate
}

export function useCreateAsk() {
  return useContext(GoContext).createAsk
}
