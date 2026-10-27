import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import RoadBadge from './RoadBadge'
export default function RoadSelect({ label, value, options, onChange, disabled = false, placeholder = '고속도로 선택', icon = null }) {
  const id = useId(), root = useRef(null), trigger = useRef(null), list = useRef(null)
  const [open, setOpen] = useState(false), [active, setActive] = useState(0)
  const selected = options.find(option => option.value === value)
  const expanded = open && !disabled
  useEffect(() => {
    if (!expanded) return
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [expanded])
  useEffect(() => { if (expanded) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active, expanded])
  function show() { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true) }
  function choose(index) { const option = options[index]; if (option) onChange(option.value); setOpen(false); trigger.current?.focus() }
  function keyDown(event) {
    if (event.key === 'Escape') { setOpen(false); event.preventDefault(); return }
    if (event.key === 'Tab') { setOpen(false); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!expanded) show()
      else setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length)
    } else if (['Enter', ' '].includes(event.key)) { event.preventDefault(); if (expanded) choose(active); else show() }
  }
  return <div className="road-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={expanded} aria-controls={`${id}-list`} aria-activedescendant={expanded && options[active] ? `${id}-${active}` : undefined} disabled={disabled} onKeyDown={keyDown} onClick={() => expanded ? setOpen(false) : show()} className="road-select-trigger">
      <span className="road-select-value">{selected?.number ? <RoadBadge type={selected.type} number={selected.number} /> : selected?.value ? icon : null}<span>{selected?.name || placeholder}</span></span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {expanded && <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="road-select-list" onMouseDown={event => event.preventDefault()}>{options.map((option, index) => <li id={`${id}-${index}`} role="option" aria-selected={value === option.value} data-index={index} key={option.value} className={active === index ? 'active' : ''} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
      {option.number ? <RoadBadge type={option.type} number={option.number} /> : option.value ? icon : null}<span>{option.name}</span>{value === option.value && <Check size={16} className="road-select-check" aria-hidden="true" />}
    </li>)}</ul>}
  </div>
}
