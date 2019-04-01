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
<a target="_blank" href="${url}">
	<h2><a>${title}</a></h2>
</article>
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

	/**Streamers and Consumers*/
	async function* articlesStreamer(data, start = 0) {
		let obj = { articles: [], start: start }
		const urls = sliceBy(data, obj.start, obj.start + 10).map(id => `${baseApi}/item/${id}.json?print=pretty`)
		obj.articles = await Promise.all((await urls.map(fetchAsyncA)))
		obj.start = obj.start + obj.articles.length
		yield obj;
	}
	const articlesConsumer = async () => {
		const articlesStream = articlesStreamer(context.topStories, context.articles.length);
		const { value: { articles } } = await articlesStream.next()
		context.articles = [...context.articles, ...articles]
		console.log(context)
		articles.forEach(({ url, title, id }) => {
			const template = useArticleTemplate(url, title)
			const attrs = { 'class': `article article-${id}` }
			const node = createNodeFromTemplate(template, 'article', attrs)
			$wrap.insertAdjacentElement('beforeend', node)
		})
		$wrap.appendChild($sentinel)
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
	fetchAsyncA(topStoriesApi).then((data) => {
		context.topStories = data;
		articlesConsumer();
		/*const urls = data.map(id => `${baseApi}/item/${id}.json?print=pretty`)
		Promise.all(urls.map(fetchAsyncA)).then(console.log).catch(console.log)*/
	})


}
document.addEventListener('DOMContentLoaded', main())

