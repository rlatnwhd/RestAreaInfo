import { useEffect } from 'react'

export default function usePageMotion(view) {
  useEffect(() => {
    const root = document.querySelector('main.main-container')
    if (!root || !window.IntersectionObserver || !Element.prototype.animate) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set()
    const play = (element, keyframes, options) => {
      if (preference.matches) return
      const animation = element.animate(keyframes, options)
      animations.add(animation)
      animation.finished.catch(() => {}).finally(() => animations.delete(animation))
    }
    play(root, [{ opacity: .35, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'ease-out' })
    const observer = new IntersectionObserver(entries => {
      let index = 0
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        entry.target.dataset.motionRevealed = 'true'
        play(entry.target, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 430, delay: (index++ % 4) * 45, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
      }
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' })
    const scan = () => root.querySelectorAll('.highway-route-card,.shelter-card,.summary-grid>article,.service-grid>a,.area-card').forEach(element => {
      if (element.dataset.motionObserved) return
      element.dataset.motionObserved = 'true'
      observer.observe(element)
    })
    let frame
    const changes = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan) })
    changes.observe(root, { childList: true, subtree: true })
    const reduce = () => { if (preference.matches) animations.forEach(animation => animation.cancel()) }
    preference.addEventListener('change', reduce)
    scan()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); changes.disconnect()
      preference.removeEventListener('change', reduce)
      animations.forEach(animation => animation.cancel())
      root.querySelectorAll('[data-motion-observed]').forEach(element => { delete element.dataset.motionObserved })
    }
  }, [view])
}
