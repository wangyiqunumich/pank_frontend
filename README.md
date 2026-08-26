# THIS IS DEVLOPMENT BRANCH

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### Local HIRN Literature QA demo

The `/hirn-literature` page implements the closed-corpus HIRN SSE contract in
`docs/FRONTEND_HANDOFF.md` from the `hirn-agent` service. It deliberately treats
an empty-reference `Complete` frame as a successful refusal, supports sources
without PMIDs or URLs, and never renders `Processing` frames or verbatim evidence.

The checked-in browser default targets the public demo endpoint:

```text
https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/demo
```

For the local demo, `.env.local` points the browser to an SSH tunnel on port
18100. Start the tunnel and the React development server together with:

```bash
npm run start:hirn-demo
```

Then open <http://localhost:3001/hirn-literature>. Override `HIRN_SSH_HOST`,
`HIRN_LOCAL_PORT`, or `PORT` when needed.

For an immediate zero-build demo with the same live SSE behavior, run:

```bash
npm run start:hirn-standalone
```

Open <http://localhost:3002>. This is useful when the legacy Create React App
bundle is slow to compile; the integrated `/hirn-literature` implementation
remains the production handoff target.

The browser client intentionally sends no API key or authorization header. Do
not place secrets in `REACT_APP_*` variables: Create React App embeds those
values in the public JavaScript bundle. The current HIRN service has no API-key
authentication and is exposed locally only through the SSH tunnel. If a future
deployment adds authentication, put the credential in a server-side proxy.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
