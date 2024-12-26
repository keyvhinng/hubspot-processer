# API Sample Test

## Enhacements brief
- Implement TypeScript to the project to have type checking. TypeScript would offer static checking that will help to catch errors in the coding phase.
- Use a more organized folder structure. Related files should belong to the same folder and not related to separated folders. I refactored the project structure, but it can be improved further.
- Add unit testing and integration testing. These tests are very critical to ensure the correctness of the code. These tests should also belong to the CI/CD pipeline.
- In order to reduce API calls to HubSpot, we can collect all of the contact IDs for all batches and make one query.
- Instead of saving the domain on each process entity, we can save the domain at the end of the program. Doing this will make only a query to the database.
- There are many places where new Date() is run; we can compute it once and reuse it.
- Instead of processing the accounts sequentially, we can process them concurrently (using Promise.all)
- We can use a more robust scheduler (e.g. RabbitMQ) to schedule the job. This will help to scale the application.


## Getting Started

This project requires a newer version of Node. Don't forget to install the NPM packages afterwards.

You should change the name of the ```.env.example``` file to ```.env```.

Run ```node app.js``` to get things started. Hopefully the project should start without any errors.

## Explanations

The actual task will be explained separately.

This is a very simple project that pulls data from HubSpot's CRM API. It pulls and processes company and contact data from HubSpot but does not insert it into the database.

In HubSpot, contacts can be part of companies. HubSpot calls this relationship an association. That is, a contact has an association with a company. We make a separate call when processing contacts to fetch this association data.

The Domain model is a record signifying a HockeyStack customer. You shouldn't worry about the actual implementation of it. The only important property is the ```hubspot```object in ```integrations```. This is how we know which HubSpot instance to connect to.

The implementation of the server and the ```server.js``` is not important for this project.

Every data source in this project was created for test purposes. If any request takes more than 5 seconds to execute, there is something wrong with the implementation.

