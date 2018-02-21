import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';
import {Server} from 'http';
import * as socketIo from 'socket.io';

const app = express();
const http = new Server(app);
const io = socketIo(http);

let config: {epoch?: string, salt?: string, port?: string};
try {
	config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
}
catch {
	console.warn("could not read config file");
	config = {};
}

app.use(cookieParser());

app.use((_req, res, next) => {
	res.cookie('epoch', config.epoch || 'January 1, 2000');
	res.cookie("salt", config.salt || "8Glo7I5BxYCLEDqqdcrP");
	next();
});

app.use(express.static('views'));

interface Tv{
	name: string;
	participants: number;
	url?: string;
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
	let tv = room.tvs.find(t => t.name === args.tv);
	if(!tv){
		tv = {name: args.tv, participants: 0, url : args.url};
		room.tvs.push(tv);
		io.emit("status_change", rooms);
		io.to(getTvId(args)).emit("query");
		socket.on("disconnect", () => {
			if(room && tv){
				room.tvs.splice(room.tvs.indexOf(tv), 1);
				if(room.tvs.length === 0){
					rooms.splice(rooms.indexOf(room), 1);
				}
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

app.get('/rooms', (_req, res) => {
	res.json(rooms);
});

const port = config.port || 3000;
http.listen(port, () => {
	// tslint:disable-next-line:no-console
	console.log(`listening on *:${port}`);
});
