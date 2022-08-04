/*
This script demonstrates how the basic couchdb operations work and
is inteded to explain that:
1) Couchdb uses a REST interface, which means we use the HTTP protocol to interact with it
2) Couchdb document have a revision which is used to prevent conflicts
3) Couchdb docs are "noSQL" meaning there are no "relations" or struct doc types
4) You structure data by creating "views" which filter and structure the couchdb documents
*/

// We will hardcode the connection string and database example here
const COUCHDB = "http://admin:a-secret@localhost:5984";
const DBNAME = "mydb";

// We first create a http GET request to the main root to show that couchdb
// gives a 200 response with JSON describing the database
console.log("requesting root domain of couchdb to show it uses http");
const root = await fetch(COUCHDB);
await logResponse(root);

// To make re-running the script easier we do some cleanup at the start
// which will delete the database created by this script
console.log("Cleaning up previous runs of this script");
await cleanup();

// To start using couchdb we will first need to create the database which can
// be done by doing a PUT request to `/dbname`
console.log("Creating database");
const createDB = await fetch(`${COUCHDB}/${DBNAME}`, { method: "PUT" });
await logResponse(createDB);

// After creating the database we can start adding documents
// we can either generate our own id's and use PUT /mydb/docID
// or let couchdb generate the id's by using POST /mydb
console.log("creating document in database");
const myFirstDoc = {
  "type": "book",
  "title": "HowDoISurviveMyFistCouchdbMigration",
  "author": "Mark",
};
const createFirstDocument = await fetch(
  `${COUCHDB}/${DBNAME}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(myFirstDoc),
  },
);
const createFirstDocumentResp = await logResponse(createFirstDocument);

// After creating our first document couchdb will respond with 2 values
// we need to keep track of. The document id and the revision.
// The id is used to get and update the created object and the revision is
// used to prevent update conflicts between client.
const myFirstDocId: string = createFirstDocumentResp.id;
const myFirstDocRev: string = createFirstDocumentResp.rev;

// After the document is created we can get the document with the ID we stored
// notice that in the resonse the revision is still the same as when we created it
console.log("Get the document to show the docId and revision");
const getMyFirstDoc = await fetch(`${COUCHDB}/${DBNAME}/${myFirstDocId}`);
await logResponse(getMyFirstDoc);

// If we want to update a document we can send a PUT /mydb/myDocId
// request. If we do this without sending a revision we get the
// following error:
console.log("Update the document without Rev to show the error");
const updateWithoutRef = await fetch(`${COUCHDB}/${DBNAME}/${myFirstDocId}`, {
  method: "POST",
  body: JSON.stringify({
    description: "Truly amazing",
  }),
});
await logResponse(updateWithoutRef);

// To prevent clients from making conflicting updates couchdb forces clients to
// send a revision id with their update. After a update has completed this revision
// will change and updated with the old revision id will fail.
// We will do 2 updated here but with the same revision to show that one of
// them will suceed while the other will return a 409 response with a documen conflict error
console.log("Update the document twice to show conflict on Rev");
const update1 = await fetch(`${COUCHDB}/${DBNAME}/${myFirstDocId}`, {
  method: "PUT",
  body: JSON.stringify({
    ...myFirstDoc,
    _rev: myFirstDocRev,
    description: "Truly amazing",
  }),
});
const update2 = await fetch(`${COUCHDB}/${DBNAME}/${myFirstDocId}`, {
  method: "PUT",
  body: JSON.stringify({
    ...myFirstDoc,
    _rev: myFirstDocRev,
    description: "A Masterpiece",
  }),
});
await logResponse(update1);
await logResponse(update2);

// To showcase how views work we will first populate the db with some documents
console.log("Populate the db with some books");
const books = await createSomebooks();
console.log(`Created books: ${books}`);
const bookDesing = {
  language: "javascript",
  views: {
    titles: {
      map: function (doc: any) {
        if (doc.type === "book") {
          emit(doc.title, 1);
        }
      }.toString(),
      reduce: "_stats",
    },
    authors: {
      map: function (doc: any) {
        if (doc.type === "book" && doc.author) {
          emit(doc.author, 1);
        }
      }.toString(),
      reduce: "_stats",
    },
  },
};

console.log(JSON.stringify(bookDesing));
console.log("Create the view in the database");
const BOOKDESIGN = "_design/books";
const viewCreate = await fetch(`${COUCHDB}/${DBNAME}/${BOOKDESIGN}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(bookDesing),
});
logResponse(viewCreate);

async function cleanup() {
  console.log(`Check if ${DBNAME} exists`);
  const dbExists = await fetch(`${COUCHDB}/${DBNAME}`);
  await logResponse(dbExists);
  if (dbExists.status == 200) {
    console.log(`${DBNAME} exist and deleting`);
    const deleteDB = await fetch(`${COUCHDB}/${DBNAME}`, { method: "DELETE" });
    await logResponse(deleteDB);
  }
}

async function logResponse(respone: Response) {
  const json = await respone.json();
  console.log(respone.status, json);
  return json;
}

async function createSomebooks() {
  const books = [
    "HowDoISurviveMyFistCouchdbMigration", // double title to show of the views
    "devops is cool",
    "ain't no thing like a devops thing",
    "How came to hate ELK",
    "What even is an ops",
    "Dev and ops relationship counseling",
  ];
  return await Promise.all(
    books.map((x) => {
      return fetch(`${COUCHDB}/${DBNAME}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            "type": "book",
            "author": "AlsoMark",
            "title": x,
          },
        ),
      }).then((x) => x.json().then((j) => j.id));
    }),
  );
}
