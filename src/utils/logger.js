function write(level, event, details = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}

module.exports = {
  info: (event, details) => write('info', event, details),
  error: (event, details) => write('error', event, details)
};
