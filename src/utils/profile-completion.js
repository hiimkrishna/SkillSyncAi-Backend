export const calculateProfileCompletion = (
  profile
) => {
  const checklist = [
    {
      id: "phone",
      label: "Add phone number",
      completed: hasValue(profile?.phone),
    },
    {
      id: "location",
      label: "Add location",
      completed: hasValue(profile?.location),
    },
    {
      id: "headline",
      label: "Add professional headline",
      completed: hasValue(profile?.headline),
    },
    {
      id: "bio",
      label: "Add professional bio",
      completed: hasValue(profile?.bio),
    },
    {
      id: "skills",
      label: "Add skills",
      completed: hasItems(profile?.skills),
    },
    {
      id: "education",
      label: "Add education",
      completed: hasItems(profile?.education),
    },
    {
      id: "experience",
      label: "Add work experience",
      completed: hasItems(profile?.experience),
    },
    {
      id: "portfolio",
      label: "Add portfolio",
      completed: hasItems(profile?.portfolio),
    },
  ];

  const completedItems =
    checklist.filter(
      (item) => item.completed
    ).length;

  const totalItems =
    checklist.length;

  const score =
    totalItems === 0
      ? 0
      : Math.round(
          (completedItems /
            totalItems) *
            100
        );

  return {
    score,
    checklist,
  };
};

const hasValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
};

const hasItems = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value).length > 0;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.length > 0;
      }

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return (
          Object.keys(parsed).length > 0
        );
      }
    } catch {
      return false;
    }
  }

  return false;
};