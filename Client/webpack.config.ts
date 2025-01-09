import { CleanWebpackPlugin } from "clean-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { join } from "path";
import webpack, { Configuration, RuleSetRule, RuleSetUseItem, WebpackPluginInstance } from "webpack";
import "webpack-dev-server";

const { DefinePlugin } = webpack;

const WEBPACK_PORT = 8081;
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || "http://127.0.0.1:8084";

const SRC_DIR = join(import.meta.dirname, "src");
const OUT_DIR = join(import.meta.dirname, "out");

interface WebpackEnv {
	prod?: boolean;
}

export default function GenerateConfiguration(env: WebpackEnv): Configuration {
	return {
		devServer: {
			historyApiFallback: {
				rewrites: [
					{ from: /./, to: "/index.html" },
				],
			},
			hot: true,
			open: false,
			host: "127.0.0.1",
			client: {
				webSocketURL: `ws://127.0.0.1:${ WEBPACK_PORT }/ws`,
			},
			devMiddleware: {
				writeToDisk: true,
			},
			port: WEBPACK_PORT,
		},
		devtool: env.prod ? "source-map" : "inline-source-map",
		entry: {
			index: join(SRC_DIR, "index.tsx"),
		},
		mode: env.prod ? "production" : "development",
		module: {
			rules: GenerateRules(),
		},
		output: {
			path: OUT_DIR,
			filename: `[name]${ env.prod ? ".[chunkhash]" : "" }.js`,
			publicPath: "auto",
		},
		plugins: GeneratePlugins(),
		resolve: {
			extensionAlias: {
				".js": [".ts", ".tsx", ".js"],
			},
			extensions: [".ts", ".tsx", ".js"],
		},
		performance: {
			maxEntrypointSize: 512 * 1024,
			maxAssetSize: 512 * 1024,
		},
		infrastructureLogging: {
			level: "log",
		},
	};
}

function GeneratePlugins(): WebpackPluginInstance[] {
	const plugins: WebpackPluginInstance[] = [
		new CleanWebpackPlugin({ verbose: true }),
		new DefinePlugin({
			"process.env": JSON.stringify({
				SERVER_ADDRESS,
			}),
		}),
		new HtmlWebpackPlugin({
			template: join(SRC_DIR, "index.ejs"),
			chunks: ["index"],
		}),
	];

	return plugins;
}

function GenerateRules(): RuleSetRule[] {
	const moduleRules: RuleSetRule[] = [
		{
			test: /\.tsx?$/i,
			exclude: /node_modules/,
			use: [{
				loader: "ts-loader",
				options: {
					configFile: "tsconfig.json",
				},
			}],
		},
		{
			test: /\.(png|jpe?g|gif|svg|eot|ttf|woff2?)$/i,
			loader: "url-loader",
			issuer: /\.[jt]sx?$/,
			options: {
				limit: 8192,
				esModule: true,
				name: "assets/[contenthash].[ext]",
			},
		},
		{
			test: /\.s?css$/i,
			use: GenerateStyleLoaders(),
		},
		{
			enforce: "pre",
			test: /\.js$/i,
			exclude: /node_modules/,
			loader: "source-map-loader",
		},
	];

	return moduleRules;
}

function GenerateStyleLoaders(): RuleSetUseItem[] {
	const styleLoaders: RuleSetUseItem[] = [
		{ loader: "style-loader" },
		{ loader: "css-loader" },
		{ loader: "sass-loader" },
	];

	return styleLoaders;
}
