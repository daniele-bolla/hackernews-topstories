import 'css-reset-and-normalize'
import './style.css'
/**Dom */
const selectEl = (selector, parent = document) => parent.querySelector(selector)
const createNodeFromTemplate = (template, wrapper, wrapperAttrs) => {
  const node = document.createElement(wrapper)
  for (const [key, value] of Object.entries(wrapperAttrs)) {
    node.setAttribute(key, value)
  }
  node.innerHTML = template
  return node
}
/**Utils */
const fetchAsyncA = async url => await (await fetch(url)).json()
const sliceBy = (list, start, end) => list.slice(start, end)
/**Templates */
const useArticleTemplate = (url, title) => `
	<h2><a target="_blank" href="${url}">${title}</a></h2>
	<button class="btn-comments-loader">Load comments</button>
`
const useCommentsTemplate = (text, by) => `
	<h3>&raquo by: <strong>${by}</strong></h3>
	<p>${text}</p>
`
/**Api */
const baseApi = `https://hacker-news.firebaseio.com/v0`
const topStoriesApi = `${baseApi}/topstories.json?print=pretty`
/**Context */
const context = {
  topStories: [],
  articles: [],
}
const updateContext = (position, newState) => {
  context[position] = [...context[position], ...newState]
}
/**Streamer and Consumer*/
async function* hackerNewsStreamer(ids, slice) {
  let start = 0
  while (start <= ids.length) {
    let urls = sliceBy(ids, start, start + slice).map(
      id => `${baseApi}/item/${id}.json?print=pretty`
    )
    yield await Promise.all(urls.map(fetchAsyncA))
    start += slice
  }
}
const hackerNewsConsumer = async (flow, cbk, ...params) => {
  const { value: articles, done } = await flow()
  if (articles && articles.length) {
    cbk(articles, ...params)
  } else {
    flow = null
  }
}
const createFlow = (generator, ...params) => {
  const iterator = generator(...params)
  return function() {
    return iterator.next.apply(iterator, arguments)
  }
}
/**Intersection Observer */
const initIntersectionObserver = (elementToObserve, cbk, ...params) => {
  const handleScrollIntersection = (entries, observerObj) => {
    const { isIntersecting } = entries[0]
    if (isIntersecting) {
      cbk(...params)
    } else {
      return
    }
  }
  const scrollObserverOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.25,
  }
  const scrollObserver = new IntersectionObserver(
    handleScrollIntersection,
    scrollObserverOptions
  )
  scrollObserver.observe(elementToObserve)
}
/**Load Comments with Click */
function initLoadCommentsClicks(wrapper) {
  wrapper.addEventListener('click', event => {
    if (event.target.className != 'btn-comments-loader') return
    const currentComponent = event.target.parentNode
    const id = currentComponent.getAttribute('id')
    const currentArticle = context.articles.find(item => id == id)
    hackerNewsConsumer(currentArticle.flow, renderComments, currentComponent)
  })
}
/**App */
const main = () => {
  const $wrap = selectEl('.wrap')
  const $sentinel = createNodeFromTemplate(null, 'div', { class: 'sentinel' })
  const saveAndRenderArticles = articles => {
    const articlesWithFLow = articles.map(article => {
      article.flow = createFlow(hackerNewsStreamer, article.kids, 2)
      return article
    })
    updateContext('articles', articlesWithFLow)
    articles.forEach(({ url, title, id, kids }) => {
      const template = useArticleTemplate(url, title)
      const attrs = { class: `article`, id }
      const node = createNodeFromTemplate(template, 'article', attrs)
      $wrap.appendChild(node)
    })
    $wrap.appendChild($sentinel)
  }
  const renderComments = (comments, currentComponent) => {
    comments.forEach(({ id, text, by }) => {
      const template = useCommentsTemplate(text, by)
      const attrs = { class: `comment`, id }
      const node = createNodeFromTemplate(template, 'div', attrs)
      const button = selectEl('.btn-comments-loader', currentComponent)
      currentComponent.insertBefore(node, button)
    })
  }
  /**Streaming -- Events and Hooks ....*/
  fetchAsyncA(topStoriesApi).then(topStories => {
    updateContext('topStories', topStories)
    const flow = createFlow(hackerNewsStreamer, topStories, 2)
    hackerNewsConsumer(flow, saveAndRenderArticles)
    initIntersectionObserver(
      $sentinel,
      hackerNewsConsumer,
      flow,
      saveAndRenderArticles
    )
    initLoadCommentsClicks($wrap)
  })
}
document.addEventListener('DOMContentLoaded', main)
