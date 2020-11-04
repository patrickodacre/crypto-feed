const EventEmitter = () => {

    const events: EventsObj = {}

    return {
        on,
        emit,
    }

    function on(evt: string, cb: () => any) : void {
        if (! events[evt]) {
            events[evt] = new Array<((payload?: any) => void)>()
        }

        events[evt].push(cb)
    }

    function emit(evt: string, payload) : void {
        if (! events[evt] || ! Array.isArray(events[evt])) {
            return
        }

        events[evt].forEach(cb => {
            cb(payload)
        })
    }
}

export default EventEmitter
