// Demo mode has no server, so these helpers play the part of one.
// `respond` waits a moment (like a network call) and returns a copy of the answer, so pages can never
// change the stored data by accident. When the backend exists, replace each `respond(...)` call with an
// axios request and everything else keeps working.
const LATENCY_MS = 120;

export function respond(compute, ms = LATENCY_MS) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(structuredClone(compute()));
      } catch (err) {
        reject(err);
      }
    }, ms);
  });
}

// Demo mode (VITE_MOCK_AUTH=true) answers from the sample data above. Otherwise the call goes to the backend.
export const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";

// fetchData(() => sampleAnswer, () => axiosRequest) -> the data the page needs, from either source
export function fetchData(demo, real) {
  return MOCK ? respond(demo) : real().then((res) => res.data.data);
}

// Modules built after demo mode (fees, exams, library ...) have no sample data in the browser, so in demo
// mode they say so instead of failing mysteriously.  realOnly(() => api.get(url)) -> the data
export function realOnly(real) {
  if (MOCK) {
    return Promise.reject(new Error("This part needs the backend and database. Set VITE_MOCK_AUTH=false in frontend/.env and start the API."));
  }
  return real().then((res) => res.data.data);
}
