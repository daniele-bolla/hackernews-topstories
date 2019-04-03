import 'css-reset-and-normalize'
import './style.css'


/**Dom */
const selectEl = (selector, parent = document) => parent.querySelector(selector)
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
	<button class="btn-comments-loader">load comments</button>
`)
const useCommentsTemplate = (text, by) => (`
	<h3>&raquo; by: <strong>${by}</strong></h3>
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
	async function* articlesStreamer(ids, slice, start = 0, end) {
		const urls = sliceBy(ids, start, start + slice).map(id => `${baseApi}/item/${id}.json?print=pretty`)
		yield await Promise.all((await urls.map(fetchAsyncA)))
	}
	const articlesConsumer = async () => {
		const articlesStream = articlesStreamer(context.topStories, 10, context.articles.length)
		const { value:articles } = await articlesStream.next()
		context.articles = [...context.articles, ...articles]
		articles.forEach(({ url, title, id, kids}) => {
			const template = useArticleTemplate(url, title)
			const attrs = { 'class': `article article-${id}`, kids, id }
			const node = createNodeFromTemplate(template, 'article', attrs)
			$wrap.appendChild(node)
		})
		$wrap.appendChild($sentinel)
	}
	const commentsConsumer = async (ids, length, currentComponent) => {
		const commentsStream = articlesStreamer(ids, 3, length)
		const { value:comments } = await commentsStream.next()
		comments.forEach(({id, text, by}) => {
			const template = useCommentsTemplate(text, by)
			const attrs = { 'class': `comment comment-${id}`, id }
			const node = createNodeFromTemplate(template, 'div', attrs)
			const button = selectEl('.btn-comments-loader', currentComponent)
			currentComponent.insertBefore(node, button)
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

