import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AppRoot } from './main'
import './styles.css'
import './brand-theme.css'

const container = document.getElementById('root')
if (!container) throw new Error('No se encontró el contenedor raíz de Acadex.')

const hotData = import.meta.hot?.data as { root?: Root } | undefined
const root = hotData?.root ?? createRoot(container)
if (import.meta.hot) import.meta.hot.data.root = root

root.render(createElement(AppRoot))
