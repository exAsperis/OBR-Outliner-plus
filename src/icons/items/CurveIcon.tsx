import { Curve, Vector2 } from "@owlbear-rodeo/sdk";
import { useMemo } from "react";
import { getPathKit } from "../../pathkit";
import { BOX_SIZE, STROKE_WIDTH, SHAPE_SIZE } from "./common";
import SvgIcon from "@mui/material/SvgIcon/SvgIcon";

export function CurveIcon({ item }: { item: Curve }) {
  const [svgString, left, top, right, bottom] = useMemo<
    [string, number, number, number, number]
  >(() => {
    const pk = getPathKit();
    const path = pk.NewPath();
    curve(item, path);

    const bounds = path.getBounds();
    const str = path.toSVGString();

    path.delete();

    return [str, bounds.fLeft, bounds.fTop, bounds.fRight, bounds.fBottom];
  }, [item]);

  const width = Math.max(right - left, 1);
  const height = Math.max(bottom - top, 1);
  const strokeScale = Math.max(width, height) / BOX_SIZE;
  const padding = (BOX_SIZE - SHAPE_SIZE) / 2;
  const paddingX = padding * (width / BOX_SIZE);
  const paddingY = padding * (height / BOX_SIZE);

  return (
    <SvgIcon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox={`${left - paddingX} ${top - paddingY} ${
          width + paddingX * 2
        } ${height + paddingY * 2}`}
        strokeWidth={STROKE_WIDTH * strokeScale}
        stroke="currentColor"
      >
        <path
          transform={`rotate(${item.rotation}, ${left + width / 2}, ${
            top + height / 2
          })`}
          d={svgString}
        />
      </svg>
    </SvgIcon>
  );
}

// An adaption from https://github.com/konvajs/konva/blob/20a91feaa34f52c2328f7c2a20082ee7879266c9/src/shapes/Line.ts
// To convert a Konva line into an SkPath

function curve(item: Curve, path: PathKit.SkPath) {
  const points = convertPointsToNumbers(item.points);
  const length = points.length;
  const tension = item.style.tension;
  const closed = item.style.fillOpacity > 0 || Boolean(item.style.closed);

  if (!length) {
    return;
  }

  path.moveTo(points[0], points[1]);

  if (tension !== 0 && length > 4) {
    const tensionPoints = getTensionPoints(points, tension, closed);
    const tensionLength = tensionPoints.length;
    let n = closed ? 0 : 4;

    if (!closed) {
      path.quadraticCurveTo(
        tensionPoints[0],
        tensionPoints[1],
        tensionPoints[2],
        tensionPoints[3]
      );
    }

    while (n < tensionLength - 2) {
      path.bezierCurveTo(
        tensionPoints[n++],
        tensionPoints[n++],
        tensionPoints[n++],
        tensionPoints[n++],
        tensionPoints[n++],
        tensionPoints[n++]
      );
    }

    if (!closed) {
      path.quadraticCurveTo(
        tensionPoints[tensionLength - 2],
        tensionPoints[tensionLength - 1],
        points[length - 2],
        points[length - 1]
      );
    }
  } else {
    // no tension
    for (let n = 2; n < length; n += 2) {
      path.lineTo(points[n], points[n + 1]);
    }
  }

  if (closed) {
    path.closePath();
  }
}

function getTensionPoints(points: number[], tension: number, closed: boolean) {
  if (closed) {
    return getTensionPointsClosed(points, tension);
  } else {
    return expandPoints(points, tension);
  }
}

function getTensionPointsClosed(p: number[], tension: number) {
  const len = p.length;
  const firstControlPoints = getControlPoints(
      p[len - 2],
      p[len - 1],
      p[0],
      p[1],
      p[2],
      p[3],
      tension
    );
  const lastControlPoints = getControlPoints(
      p[len - 4],
      p[len - 3],
      p[len - 2],
      p[len - 1],
      p[0],
      p[1],
      tension
    );
  const middle = expandPoints(p, tension);
  const tp = [firstControlPoints[2], firstControlPoints[3]]
    .concat(middle)
    .concat([
      lastControlPoints[0],
      lastControlPoints[1],
      p[len - 2],
      p[len - 1],
      lastControlPoints[2],
      lastControlPoints[3],
      firstControlPoints[0],
      firstControlPoints[1],
      p[0],
      p[1],
    ]);

  return tp;
}

function getControlPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
) {
  const d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
  const d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const fa = (t * d01) / (d01 + d12);
  const fb = (t * d12) / (d01 + d12);
  const p1x = x1 - fa * (x2 - x0);
  const p1y = y1 - fa * (y2 - y0);
  const p2x = x1 + fb * (x2 - x0);
  const p2y = y1 + fb * (y2 - y0);

  return [p1x, p1y, p2x, p2y];
}

function expandPoints(p: number[], tension: number) {
  const len = p.length;
  const allPoints: number[] = [];

  for (let n = 2; n < len - 2; n += 2) {
    const cp = getControlPoints(
      p[n - 2],
      p[n - 1],
      p[n],
      p[n + 1],
      p[n + 2],
      p[n + 3],
      tension
    );
    if (isNaN(cp[0])) {
      continue;
    }
    allPoints.push(cp[0]);
    allPoints.push(cp[1]);
    allPoints.push(p[n]);
    allPoints.push(p[n + 1]);
    allPoints.push(cp[2]);
    allPoints.push(cp[3]);
  }

  return allPoints;
}

function convertPointsToNumbers(points: Vector2[]): number[] {
  const numbers: number[] = [];
  for (const point of points) {
    numbers.push(point.x);
    numbers.push(point.y);
  }
  return numbers;
}
