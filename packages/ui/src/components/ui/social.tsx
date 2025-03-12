import { type IconType } from "react-icons";
import { Card } from "./card";
import Link from "next/link";

const Social = ({
  name,
  href,
  Icon,
}: {
  name: string;
  href: string;
  Icon: IconType;
}) => {
  return (
    <Link href={href}>
      <Card className="flex flex-col items-center p-6 hover:bg-gray-800/5 transition-colors">
        <Icon size={40} />
        <p className="mt-3 text-sm">{name}</p>
      </Card>
    </Link>
  );
};

export default Social;
