import * as express from 'express';
import {Server} from 'http';
import * as socketIo from 'socket.io';
import * as fs from 'fs';

const app = express();
const http = new Server(app);
const io = socketIo(http);

app.get('/display.html', function(req, res){
	res.sendFile(__dirname + '/views/display.html');
});

app.get('/meeting.html', function(req, res){
	res.sendFile(__dirname + '/views/meeting.html');
});

app.get('/', function(req, res){
	res.sendFile(__dirname + '/views/index.html');
});

interface Tv{
	name: string;
	participants: number;
	url?: string;
}

interface Room{
	name: string;
	tvs: Tv[];
}

var rooms: Room[] = [];

function joinTv(args: {room: string, tv: string, isTv?: boolean, url?: string}, socket: SocketIO.Socket){
	let room = rooms.find(room => room.name === args.room);
	if(!room){
		room = {name: args.room, tvs: []};
		rooms.push(room);
	}
	let tv = room.tvs.find(tv => tv.name === args.tv);
	if(!tv){
		tv = {name: args.tv, participants: 0, url : args.url};
		room.tvs.push(tv);
		io.emit("status_change", rooms);
		io.to(getTvId(args)).emit("query");
		socket.on("disconnect", () => {
			if(room && tv){
				room.tvs.splice(room.tvs.indexOf(tv), 1);
				if(room.tvs.length == 0){
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
	let room = rooms.find(room => room.name === args.room);
	if(room){
		let tv = room.tvs.find(tv => tv.name === args.tv);
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

io.on('connection', function(socket){
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
  	})
});

app.get('/rooms', (req, res) => {
	res.json(rooms);
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});
