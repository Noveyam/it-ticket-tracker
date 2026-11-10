// IT sample data
const ticket = {
  id: "TKT-001",
  title: "Printer won't connect",
  description: "My laptop can't find the office printer over Wi-Fi. Printing worked yesterday. I restarted the printer, but it still doesn't appear.",
  priority: "low",
  status: "open"
};

const secondTicket = {
  id: "TKT-002",
  title: "Update software",
  description: "We need to update the main server software to the latest version.",
  priority: "high",
  status: "resolved"
};

const savedTickets = localStorage.getItem("tickets");
const tickets = savedTickets !== null? JSON.parse(savedTickets): [ticket, secondTicket];

for (const currentTicket of tickets) {
  if (!currentTicket.id) {
    currentTicket.id = crypto.randomUUID();
  }
};

localStorage.setItem("tickets", JSON.stringify(tickets));

// Counts tickets whose status is open.
function countOpen(tickets) {
  let openCount = 0;
  for (const currentTicket of tickets) {
    if (currentTicket.status === "open") {
      openCount++;
    }
  }
  return openCount;
};

// Find page elements by their HTML IDs.
const ticketFormElement = document.getElementById("ticket-form");
const openCountElement = document.getElementById("open-count");
const ticketListElement = document.getElementById("ticket-list");
const ticketTitleElement = document.getElementById("ticket-title");
const ticketErrorElement = document.getElementById("title-error");
const ticketPriorityElement = document.getElementById("ticket-priority");
const ticketDescriptionElement = document.getElementById("ticket-description");
const ticketFilterElement = document.getElementById("status-filter");

openCountElement.textContent = countOpen(tickets);

// Displays all tickets
function renderTickets(tickets) {
  ticketListElement.replaceChildren();
  const selectedStatus = ticketFilterElement.value;

  for (const currentTicket of tickets) {
    if (selectedStatus !== "all" && currentTicket.status !== selectedStatus) {
      continue;
    }
    const priorityLabel = currentTicket.priority ?? "not set";
    const priorityElement = document.createElement("span");
    priorityElement.textContent = priorityLabel;
    priorityElement.className = "priority-label priority-" + priorityLabel;
    
    const listItem = document.createElement("li");
    listItem.textContent = currentTicket.title + " - ";
    listItem.appendChild(priorityElement);
    listItem.append(" - " + currentTicket.status);
    
    const descriptionElement = document.createElement("p");
    descriptionElement.textContent = currentTicket.description ?? "";
    listItem.appendChild(descriptionElement);
    
    const resolveButton = document.createElement("button");
    resolveButton.type = "button";
    resolveButton.className = "resolve-button";
    resolveButton.textContent = "Resolve";
    resolveButton.addEventListener("click", function () {
      currentTicket.status = "resolved";
      localStorage.setItem("tickets", JSON.stringify(tickets));
      renderTickets(tickets);
      openCountElement.textContent = countOpen(tickets);
    });
    resolveButton.disabled = currentTicket.status === "resolved";

    listItem.appendChild(resolveButton);
    ticketListElement.appendChild(listItem);
  }
};

renderTickets(tickets);

// Handle form submission.
ticketFormElement.addEventListener("submit", function (event) {
  event.preventDefault();
  const title = ticketTitleElement.value.trim();
  const description = ticketDescriptionElement.value.trim();
  const priority = ticketPriorityElement.value;

  if (title === "") {
    ticketErrorElement.textContent = "Enter a title that is not only spaces.";
    ticketTitleElement.value = "";
    ticketTitleElement.focus();
    return;
  }

  ticketErrorElement.textContent = "";

  const newTicket = {
    title: title,
    status: "open",
    priority: priority,
    description: description,
    id: crypto.randomUUID(),
  };

  tickets.push(newTicket);
  localStorage.setItem("tickets", JSON.stringify(tickets));
  renderTickets(tickets);
  openCountElement.textContent = countOpen(tickets);
  ticketFormElement.reset();
});

ticketFilterElement.addEventListener("change", function () {
  renderTickets(tickets);
});