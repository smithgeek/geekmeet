import {exec} from 'child_process';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';
import {Server} from 'http';
import * as socketIo from 'socket.io';

const app = express();
const http = new Server(app);
const io = socketIo(http);

let config: {epoch?: string, salt?: string, port?: string, host?: string};
try {
	config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
}
catch {
	console.warn("could not read config file");
	config = {};
}

const oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds

app.use(cookieParser());

app.use((_req, res, next) => {
	const epoch = new Date(config.epoch || 'January 1, 2000');
	const today = new Date();
	const diffDays = Math.round(Math.abs((epoch.getTime() - today.getTime())/(oneDay)));
	res.cookie('seed', diffDays);
	res.cookie("salt", config.salt || "8Glo7I5BxYCLEDqqdcrP");
	next();
});

function getScript(req: express.Request, file: string) {
	const wifiConfig = fs.readFileSync("./wifi.config", "utf8");

	return fs.readFileSync(`./src/views/${file}`, "utf8").replace("{url}", `https://${config.host || req.get('host')}`)
		.replace("{wificonfig}", wifiConfig).replace(/\r\n/g, "\n");
}

app.get("/start.sh", (req, res) => {
	res.send(getScript(req, "start.sh"));
});

app.get("/update.sh", (req, res) => {
	res.send(getScript(req, "update.sh"));
});

app.get("/setup.sh", (req, res) => {
	res.send(getScript(req, "setup.sh"));
});

app.use(express.static('./src/views'));

interface Tv{
	name: string;
	participants: number;
	url?: string;
	ip: string;
	online: boolean;
	statusTime: Date;
}

interface Room{
	name: string;
	tvs: Tv[];
}

const rooms: Room[] = [];

function joinTv(args: {room: string, tv: string, isTv?: boolean, url?: string}, socket: SocketIO.Socket){
	let room = rooms.find(r => r.name === args.room);
	if(!room){
		room = {name: args.room, tvs: []};
		rooms.push(room);
	}
	const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
	let tv = room.tvs.find(t => t.name === args.tv);
	if (tv) {
		tv.online = true;
		tv.statusTime = new Date();
		tv.ip = ip;
		io.emit("status_change", rooms);
	}
	else {
		tv = {name: args.tv, participants: 0, url : args.url, ip, online: true, statusTime: new Date()};
		room.tvs.push(tv);
		// tslint:disable-next-line:no-console
		console.log("new tv joined", { room: room.name, tv: tv.name, ip });
		io.emit("status_change", rooms);
		io.to(getTvId(args)).emit("query");
		socket.on("disconnect", () => {
			if (tv) {
				tv.online = false;
				tv.statusTime = new Date();
				io.emit("status_change", rooms);
			}
		});
		socket.on("url_change", url => {
			if(tv){
				tv.url = url;
				io.emit("status_change", rooms);
			}
		});
	}
}

function joinUser(args: {room: string, tv: string, isTv?: boolean}, socket: SocketIO.Socket){
	const room = rooms.find(r => r.name === args.room);
	if(room){
		const tv = room.tvs.find(t => t.name === args.tv);
		if(tv){
			tv.participants += 1;
			io.to(getTvId(args)).emit("participants_change", tv.participants);
			io.emit("status_change", rooms);
			socket.on("disconnect", () => {
				if(tv){
					tv.participants -= 1;
					io.to(getTvId(args)).emit("participants_change", tv.participants);
					io.emit("status_change", rooms);
				}
			});
		}
	}
}

function getTvId(args: {room: string, tv: string}){
	return `${args.room}_${args.tv}`;
}

io.on('connection', (socket) => {
	socket.emit("query", rooms);
	socket.on("join", (args: {room: string, tv: string, isTv?: boolean}) => {
		if(args.isTv){
			joinTv(args, socket);
		}
		else{
			joinUser(args, socket);
		}
		socket.join(getTvId(args));
	});

	socket.on('action', args => {
		io.to(args.target).emit('action', args);
	});
});

app.get('/api/rooms', (_req, res) => {
	res.json(rooms);
});

app.get("/api/Update", (_req, res) => {
	exec("npm run update", (error, stdout, stderr) => {
		res.status(200).json({error, stdout, stderr}).send();
	});
});

app.get("/api/Restart", () => {
	process.exit(1);
});

const port = config.port || 3000;
http.listen(port, () => {
	// tslint:disable-next-line:no-console
	console.log(`listening on *:${port}`);
});
