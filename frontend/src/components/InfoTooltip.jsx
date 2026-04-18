import { useState } from 'react'

export const TOKEN_DESCRIPTIONS = {
  'Input Tokens':  'Text you send to Claude — your messages, prompts, code, and file contents. Billed per token sent.',
  'Output Tokens': 'Text Claude generates in reply. The most expensive token type — Claude "thinks" these out one by one.',
  'Cache Write':   'Tokens written into the prompt cache so they can be reused across requests. Billed once at a slightly higher rate.',
  'Cache Read':    'Tokens loaded from the prompt cache instead of re-sending them as input. Up to 10× cheaper than Input tokens.',
}

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="info-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="info-icon">?</span>
      {visible && <span className="info-tooltip-box">{text}</span>}
    </span>
  )
}
