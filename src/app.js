import './style.css'
import 'css-reset-and-normalize'

/**Dom */
const selectEl = (selector, parent = document) => parent.querySelector(selector)
const selectEls = (selector, parent = document) => parent.querySelectorAll(selector)
const show = elem => elem.style.display = 'block'
const hide = elem => elem.style.display = 'none'
const createNodeFromTemplate = (template, wrapper, wrapperAttrs) => {
	const node = document.createElement(wrapper)
	for (const [key, value] of Object.entries(wrapperAttrs)) {
		node.setAttribute(key, value)
	}
	node.innerHTML = template;
	return node;
}

/**Utils */
const fetchAsyncA = async (url) => await (await fetch(url)).json()
const sliceBy = (list, start, end) => list.slice(start, end)

/**Templates */
const useArticleTemplate = (url, title) => (`
	<h2><a target="_blank" onclick="event.stopPropagation()" href="${url}">${title}</a></h2>
	<button>Load Comment</button>
`)
const useCommentsTemplate = (text, by) => (`
	<h3>${by}</h3>
	<hr/>
	<p>${text}</p>
`)

/**Api */
const baseApi = `https://hacker-news.firebaseio.com/v0`
const topStoriesApi = `${baseApi}/topstories.json?print=pretty`

/**App */
const main = () => {

	const context = {
		topStories: [],
		articles: []
	}
	const $wrap = selectEl('.wrap')
	const $sentinel = createNodeFromTemplate(null, 'div', { 'class': 'sentinel' })
	$wrap.addEventListener('click',(event) => {
		const currentComponent = event.target.parentNode
		const kids = currentComponent.getAttribute("kids").split(',')
		const id = currentComponent.getAttribute("id")
		commentsConsumer(kids, 0, currentComponent)

	})

	/**Streamers and Consumers*/
	async function* articlesStreamer(ids, start = 0) {
		let obj = { articles: [], start: start }
		const urls = sliceBy(ids, obj.start, obj.start + 10).map(id => `${baseApi}/item/${id}.json?print=pretty`)
		obj.articles = await Promise.all((await urls.map(fetchAsyncA)))
		obj.start = obj.start + obj.articles.length
		yield obj;
	}
	const articlesConsumer = async () => {
		const articlesStream = articlesStreamer(context.topStories, context.articles.length)
		const { value: { articles } } = await articlesStream.next()
		context.articles = [...context.articles, ...articles]
		articles.forEach(({ url, title, id, kids}) => {
			const template = useArticleTemplate(url, title)
			const attrs = { 'class': `article article-${id}`, kids, id }
			const node = createNodeFromTemplate(template, 'article', attrs)
			$wrap.insertAdjacentElement('beforeend', node)
		})
		$wrap.appendChild($sentinel)
	}
	const commentsConsumer = async (ids, length, currentComponent) => {
		const commentsStream = articlesStreamer(ids, length)
		const { value: { articles } } = await commentsStream.next()
		articles.forEach(({id, text, by}) => {
			const template = useCommentsTemplate(text, by)
			const attrs = { 'class': `comment comment-${id}`, id }
			const node = createNodeFromTemplate(template, 'div', attrs)
			currentComponent.insertAdjacentElement('beforeend', node)
		})
	}

	/**Intersection Observer */
	const scrollObserverOptions = {
		root: null,
		rootMargin: '0px',
		threshold: 0.25
	}
	const handleScrollIntersection = (entries, observerObj) => {
		const { isIntersecting } = entries[0];
		if (isIntersecting) {
			articlesConsumer()
		} else {
			return
		}
	}
	const scrollObserver = new IntersectionObserver(handleScrollIntersection, scrollObserverOptions);
	scrollObserver.observe($sentinel);

	/**Streaming ....*/
	fetchAsyncA(topStoriesApi).then((topStories) => {
		context.topStories = topStories;
		articlesConsumer();
		/*const urls = topStories.map(id => `${baseApi}/item/${id}.json?print=pretty`)
		Promise.all(urls.map(fetchAsyncA)).then(console.log).catch(console.log)*/
	})

}
document.addEventListener('DOMContentLoaded', main())

