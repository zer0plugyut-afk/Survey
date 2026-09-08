import { useEffect, useRef, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useModal } from 'connectkit'
import { shortAddr } from '../config/sepolia'

/**
 * Header wallet control.
 * ConnectKit's default button can reopen "Connect Wallet" even when an address
 * is already shown — we gate on wagmi `address` and offer Disconnect instead.
 */
export function WalletControl() {
  const { address, chain } = useAccount()
  const { disconnect, isPending } = useDisconnect()
  const { setOpen } = useModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (!address) {
    return (
      <button type="button" className="wallet-btn wallet-btn--connect" onClick={() => setOpen(true)}>
        Connect wallet
      </button>
    )
  }

  return (
    <div className="wallet-menu" ref={rootRef}>
      <button
        type="button"
        className="wallet-btn wallet-btn--account"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="wallet-btn__dot" aria-hidden />
        <span className="wallet-btn__addr">{shortAddr(address)}</span>
      </button>
      {menuOpen ? (
        <div className="wallet-menu__panel" role="menu">
          <div className="wallet-menu__meta">
            <span className="mono">{address}</span>
            {chain?.name ? <span>{chain.name}</span> : null}
          </div>
          <button
            type="button"
            className="wallet-menu__item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              setOpen(true)
            }}
          >
            Switch wallet
          </button>
          <button
            type="button"
            className="wallet-menu__item wallet-menu__item--danger"
            role="menuitem"
            disabled={isPending}
            onClick={() => {
              setMenuOpen(false)
              disconnect()
            }}
          >
            {isPending ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
