afterAll(async () => {
  try {
    const { todos } = mongoose.connection.collections;
    // Collection is being dropped.
    await todos.drop();
    // Connection to Mongo killed.
    await mongoose.disconnect();
    // Server connection closed.
    await server.close();
  } catch (error) {
    console.log(`
        Error:
        ${error}
      `);
    throw error;
  }
});
