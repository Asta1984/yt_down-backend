import { EventEmitter } from "events";

// Single shared emitter for the whole process
// worker.js and the SSE route both import this same instance
const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(50); // one per concurrent download

export default progressEmitter;