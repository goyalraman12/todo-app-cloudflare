/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const html = (data) => `
<!DOCTYPE html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
	<meta name="description" content="todo app">
    <title>Todos</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-black">
    <div class="w-full h-full flex content-center justify-center mt-8">
      <div class="bg-white shadow-md rounded px-8 pt-6 py-8 mb-4">
        <h1 class="block text-grey-800 text-md font-bold mb-2">Todos</h1>
        <div class="flex">
          <input class="shadow appearance-none border rounded w-full py-2 px-3 text-grey-800 leading-tight focus:outline-none focus:shadow-outline" type="text" name="name" placeholder="A new todo"></input>
          <button class="bg-black hover:bg-white hover:text-black border-2 border-black text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="create" type="submit">Create</button>
        </div>
        <div class="mt-4" id="todos"></div>
      </div>
    </div>
  </body>
  <script>
    window.todos = ${data}
    var updateTodos = function() {
      fetch("/", { method: 'PUT', body: JSON.stringify({ todos: window.todos }) })
      populateTodos()
    }
    var completeTodo = function(evt) {
      var markComplete = evt.target
      var todoElement = markComplete.parentNode
      var newTodoSet = [].concat(window.todos)
      var todo = newTodoSet.find(t => t.id == todoElement.dataset.todo)
      todo.completed = !todo.completed
      window.todos = newTodoSet
      updateTodos()
    }
    var populateTodos = function() {
      var todoContainer = document.querySelector("#todos")
      todoContainer.innerHTML = null
      window.todos.forEach(todo => {
        var el = document.createElement("div")
        el.className = "border-t py-4 flex justify-between"
        el.dataset.todo = todo.id
        var name = document.createElement("span")
        name.className = todo.completed ? "line-through" : ""
        name.textContent = todo.name
		var markComplete = document.createElement("button")
		markComplete.innerText = todo.completed ? "Mark incomplete" : "Mark Complete"
		markComplete.addEventListener('click', completeTodo)
		markComplete.className = "border rounded p-1 bg-blue-700 hover:bg-blue-900 text-white"
        el.appendChild(name)
		el.appendChild(markComplete)
        todoContainer.appendChild(el)
      })
    }
    populateTodos()
    var createTodo = function() {
      var input = document.querySelector("input[name=name]")
      if (input.value.length) {
        window.todos = [].concat(todos, { id: window.todos.length + 1, name: input.value, completed: false })
        input.value = ""
        updateTodos()
      }
    }
    document.querySelector("#create").addEventListener('click', createTodo)
  </script>
</html>
`;

export default {
	async fetch(request, env, ctx) {
		const defaultData = { todos: [] };
		const getCache = (key) => env.MY_FIRST_KV.get(key);
		const setCache = (key, data) => env.MY_FIRST_KV.put(key, data);

		async function getTodos(request) {
			const ip = request.headers.get('CF-Connecting-IP');
			const cacheKey = `data-${ip}`;
			let data;
			const cache = await getCache(cacheKey);
			if (!cache) {
				await setCache(cacheKey, JSON.stringify(defaultData));
				data = defaultData;
			} else {
				data = JSON.parse(cache);
			}
			const body = html(JSON.stringify(data.todos || []));
			return new Response(body, {
				headers: { 'Content-Type': 'text/html' },
			});
		}

		async function updateTodos(request) {
			const body = await request.text();
			const ip = request.headers.get('CF-Connecting-IP');
			const cacheKey = `data-${ip}`;
			try {
				JSON.parse(body);
				await setCache(cacheKey, body);
				return new Response(body, { status: 200 });
			} catch (err) {
				return new Response(err, { status: 500 });
			}
		}

		if (request.method === 'PUT') {
			return updateTodos(request);
		} else {
			return getTodos(request);
		}
	},
};
